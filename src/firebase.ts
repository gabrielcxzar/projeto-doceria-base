import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  getAuth,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDocFromServer,
  getDocsFromServer,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { collections } from "./types";
import type { CollectionName, DataStore, Mutation, UserProfile } from "./types";
import { encodeBackup } from "./domain";

// Configuração pública do aplicativo web, preservada do projeto original.
const useEmulators =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_EMULATORS === "1" &&
  ["localhost", "127.0.0.1"].includes(location.hostname);
const app = initializeApp({
  apiKey: "AIzaSyBtmmi8NLvJswGLzGNs-NdIYwqqizBDWaI",
  authDomain: "gestao-de-confeitaria.firebaseapp.com",
  projectId: useEmulators ? "demo-doceria" : "gestao-de-confeitaria",
  storageBucket: "gestao-de-confeitaria.firebasestorage.app",
  messagingSenderId: "361729178674",
  appId: "1:361729178674:web:ecb34f5f4b6f7c9355502b",
});
export const auth = getAuth(app);
export const db = getFirestore(app);
if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
export async function login(
  email: string,
  password: string,
  remember: boolean,
) {
  await setPersistence(
    auth,
    remember ? browserLocalPersistence : browserSessionPersistence,
  );
  await signInWithEmailAndPassword(auth, email.trim(), password);
}
export const logout = () => signOut(auth);
export async function profileFor(uid: string): Promise<UserProfile> {
  const snap = await getDocFromServer(doc(db, "usuarios", uid));
  const data = snap.data();
  if (!snap.exists() || !["admin", "viewer"].includes(data?.role))
    throw new Error(
      "Sua conta não possui um perfil autorizado. Contate o administrador.",
    );
  return { ...data, id: uid } as UserProfile;
}
export function subscribeData(
  onData: <K extends CollectionName>(name: K, records: DataStore[K]) => void,
  onError: (error: unknown) => void,
) {
  return collections.map((name) => {
    const ref = collection(db, name);
    const source =
      name === "atividades"
        ? query(ref, orderBy("criadoEm", "desc"), limit(40))
        : ref;
    return onSnapshot(
      source,
      (snap) => {
        onData(
          name,
          snap.docs.map((d) => ({
            ...d.data(),
            id: d.id,
          })) as DataStore[typeof name],
        );
      },
      onError,
    );
  });
}
export async function mutate(
  changes: Mutation[],
  profile: UserProfile,
  description: string,
) {
  if (profile.role !== "admin")
    throw new Error("Seu perfil permite somente consulta.");
  if (!navigator.onLine) throw new Error("Conecte-se à internet para salvar.");
  // Valida a sessão no servidor antes de abrir um lote. Sem persistência offline.
  const current = auth.currentUser;
  if (!current || current.uid !== profile.id)
    throw new Error("A sessão expirou. Entre novamente.");
  const liveProfile = await profileFor(current.uid);
  if (liveProfile.role !== "admin")
    throw new Error("Seu perfil permite somente consulta.");
  if (!navigator.onLine) throw new Error("Conecte-se à internet para salvar.");
  if (changes.length > 400)
    throw new Error("Operação muito grande. Faça em grupos menores.");
  // Transações falham sem conexão, em vez de enfileirar uma escrita offline.
  // A versão lida na tela impede sobrescrever silenciosamente uma edição concorrente.
  const operations = changes.map((change) => ({
    change,
    ref: change.id
      ? doc(db, change.collection, change.id)
      : doc(collection(db, change.collection)),
  }));
  const activity = doc(collection(db, "atividades"));
  await runTransaction(db, async (transaction) => {
    for (const { change, ref } of operations) {
      if (change.collection === "usuarios")
        throw new Error("Gerencie os acessos pelo administrador do Firebase.");
      if (change.id) {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists())
          throw new Error(
            "Este registro foi removido por outra pessoa. Atualize a tela.",
          );
        const updated = snapshot.data().atualizadoEm;
        if (
          change.expectedUpdatedAt !== undefined &&
          (updated?.toMillis() ?? 0) !== change.expectedUpdatedAt
        )
          throw new Error(
            "Este registro foi alterado por outra pessoa. Feche o formulário e revise os dados atualizados.",
          );
      }
    }
    for (const { change, ref } of operations) {
      if (change.remove) transaction.delete(ref);
      else {
        const value = {
          ...change.data,
          atualizadoEm: serverTimestamp(),
          ...(!change.id ? { criadoEm: serverTimestamp() } : {}),
        };
        if (change.id) transaction.update(ref, value);
        else transaction.set(ref, value);
      }
    }
    transaction.set(activity, {
      tipo: "edicao",
      descricao: description,
      usuarioNome: profile.nome,
      criadoEm: serverTimestamp(),
      atualizadoEm: serverTimestamp(),
    });
  });
}
export async function completeBackup(profile: UserProfile) {
  if (profile.role !== "admin")
    throw new Error(
      "Somente administradores podem exportar o arquivo completo.",
    );
  if (!navigator.onLine)
    throw new Error("Conecte-se à internet para exportar.");
  const result: Record<string, unknown> = {};
  for (const name of collections) {
    const snap = await getDocsFromServer(collection(db, name));
    result[name] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }
  return {
    schemaVersion: 1,
    projectId: "gestao-de-confeitaria",
    exportedAt: new Date().toISOString(),
    collections: encodeBackup(result),
  };
}
export function friendlyError(error: unknown) {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  if (
    /invalid-credential|wrong-password|user-not-found|invalid-email/.test(code)
  )
    return "E-mail ou senha incorretos.";
  if (/too-many-requests/.test(code))
    return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
  if (/permission-denied|unauthorized/.test(code))
    return "Você não tem permissão para esta operação.";
  if (/network|unavailable|offline/.test(code))
    return "Não foi possível confirmar a conexão com o Firebase. Verifique a internet.";
  return error instanceof Error && !code
    ? error.message
    : "Não foi possível concluir. Tente novamente.";
}
