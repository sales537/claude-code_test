/**
 * IndexedDB Storage Layer for LP Content Management
 * localStorage (5-10MB) から IndexedDB (数百MB+) に移行
 */
const LPStorage = (function () {
  const DB_NAME = "kantoKaseiDB";
  const DB_VERSION = 1;
  const STORE_NAME = "content";

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function get(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async function set(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function remove(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function has(key) {
    const value = await get(key);
    return value !== null;
  }

  // Migrate data from localStorage to IndexedDB (one-time)
  async function migrateFromLocalStorage() {
    const publishedLS = localStorage.getItem("kantoKaseiLP");
    const draftLS = localStorage.getItem("kantoKaseiLP_draft");

    const publishedIDB = await get("published");
    const draftIDB = await get("draft");

    if (publishedLS && !publishedIDB) {
      try {
        await set("published", JSON.parse(publishedLS));
        localStorage.removeItem("kantoKaseiLP");
      } catch (e) {
        // ignore parse errors
      }
    }

    if (draftLS && !draftIDB) {
      try {
        await set("draft", JSON.parse(draftLS));
        localStorage.removeItem("kantoKaseiLP_draft");
      } catch (e) {
        // ignore parse errors
      }
    }
  }

  return {
    getDraft: () => get("draft"),
    getPublished: () => get("published"),
    saveDraft: (data) => set("draft", data),
    publish: (data) => set("published", data),
    removeDraft: () => remove("draft"),
    hasDraft: () => has("draft"),
    hasPublished: () => has("published"),
    migrate: migrateFromLocalStorage,
    // For export: returns raw JSON string
    exportJSON: async () => {
      const published = await get("published");
      const draft = await get("draft");
      return JSON.stringify(published || draft);
    },
    // For import
    importJSON: (data) => set("draft", data),
  };
})();
