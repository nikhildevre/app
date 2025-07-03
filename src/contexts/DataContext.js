import React, { createContext, useCallback, useContext } from "react";
import {
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore/lite";

import { useAuth } from "./AuthContext";
import { db } from "../firebase";
const DataProviderContext = createContext();

export const useData = () => {
  return useContext(DataProviderContext);
};

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [currentModel, setCurrentModel] = React.useState({
    framework: "huggingface",
    model: "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
  });
  const retryablePostData = ({ url = "", data = {}, timeout = 8000 }) => {
    return new Promise(async (resolve, reject) => {
      var retries = 3;
      var response;
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          response = await fetch(url, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            body: JSON.stringify(data),
            signal: controller.signal,
          });
          clearTimeout(id);

          // Handle 404 immediately
          if (response.status === 404) {
            reject(new Error("Resource not found"));
            return;
          }

          // Handle other non-200 responses
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Success case
          resolve(response.json());
          return;
        } catch (e) {
          console.log("Post error:", e);
          retries--;
          if (retries === 0) {
            reject(e);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
    });
  };

  const retryableGetData = async ({ url = "", timeout = 5000 }) => {
    return new Promise(async (resolve, reject) => {
      var retries = 3;
      var response;
      while (retries > 0) {
        try {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          response = await fetch(url, {
            method: "GET",
            mode: "cors",
            cache: "no-cache",
            credentials: "same-origin",
            headers: {
              "Content-Type": "application/json",
            },
            redirect: "follow",
            referrerPolicy: "no-referrer",
            signal: controller.signal,
          });
          clearTimeout(id);

          // Handle 404 immediately
          if (response.status === 404) {
            reject(new Error("Resource not found"));
            return;
          }

          // Handle other non-200 responses
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          // Success case
          resolve(response.json());
          return;
        } catch (e) {
          console.log("Get error:", e);
          retries--;
          if (retries === 0) {
            reject(e);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          }
        }
      }
    });
  };

  const parse = (allFiles) => {
    return retryablePostData({
      url: process.env.REACT_APP_API_PARSE,
      data: allFiles,
      timeout: 15000,
    });
  };
  const match = useCallback(
    // allow the forcing of a model
    (instruments, model) => {
      return retryablePostData({
        url:
          process.env.REACT_APP_API_MATCH + "?include_catalogue_matches=true",
        data: {
          instruments: instruments,
          parameters: model || currentModel,
        },
        timeout: 30000,
      });
    },
    [currentModel]
  );

  const exampleInstruments = useCallback(() => {
    return retryablePostData({
      url: process.env.REACT_APP_API_EXAMPLES,
      timeout: 5000,
    });
  }, []);

  const getVersion = useCallback(() => {
    return retryableGetData({
      url: process.env.REACT_APP_API_VERSION,
      timeout: 10000,
    }).then((data) => data.harmony_version || "unknown");
  }, []);

  const getModels = useCallback(() => {
    return retryableGetData({
      url: process.env.REACT_APP_API_MODELS,
      timeout: 10000,
    });
  }, []);

  const getSharedInstrument = async (docID) => {
    if (docID) {
      const docRef = doc(db, "imports", docID);
      const h = await getDoc(docRef);
      if (h.exists()) {
        updateDoc(docRef, {
          accessed: serverTimestamp(),
        });
        return h.data();
      } else
        return Promise.reject(Error(`No such shared instrument: .${docID}`));
    }
  };

  const getPublicHarmonisations = async (docID) => {
    if (docID) {
      const docRef = doc(db, "harmonisations", docID);
      const h = await getDoc(docRef);
      if (h.exists()) {
        updateDoc(docRef, {
          lastAccessed: serverTimestamp(),
        });
        return undoPrepForFireStore(h.data());
      } else return Promise.reject(Error(`No such harmonisation: .${docID}`));
    } else {
      const q = query(
        collection(db, "harmonisations"),
        where("public", "==", true)
      );
      const querySnapshot = await getDocs(q);
      let ph = [];
      querySnapshot.forEach((doc) => {
        ph.push(doc.data());
      });
      if (ph.length) return ph;
      else return Promise.reject(Error(`No public harmonisations`));
    }
  };

  const reportRating = async (rating) => {
    let r = {};
    r.uid = currentUser ? currentUser.uid : "anon";
    r.rating = rating;
    r.created = serverTimestamp();
    return addDoc(collection(db, "ratings"), r);
  };

  const getMyHarmonisations = async () => {
    const q = query(
      collection(db, "harmonisations"),
      where("uid", "==", currentUser.id)
    );
    const querySnapshot = await getDocs(q);
    let h = [];
    querySnapshot.forEach((doc) => {
      h.push(doc.data());
    });
    if (h.length) {
      return h;
    } else {
      return Promise.reject(Error(`No saved harmonisations`));
    }
  };

  // returns a promise
  const storeHarmonisation = async (harmonisation, docID) => {
    harmonisation.uid = currentUser.uid;
    // if docID is specified check it is owned by current user
    if (docID) {
      const docu = await getDoc(doc(db, "harmonisations", docID));
      if (docu.exists() && docu.data.uid !== currentUser.uid) {
        Promise.reject(Error(`Specified docID is not owned by current user`));
      }
      harmonisation.updated = serverTimestamp();
      return setDoc(
        doc(db, "harmonisations", docID),
        prepForFireStore(harmonisation)
      );
    } else {
      harmonisation.created = serverTimestamp();
      return addDoc(
        collection(db, "harmonisations"),
        prepForFireStore(harmonisation)
      );
    }
  };

  const reportMisMatch = async (mismatch) => {
    console.log(mismatch);
    var q1 = { ...mismatch.q1 };
    var q2 = { ...mismatch.q2 };
    var m = { q1: q1, q2: q2 };

    m.uid = currentUser ? currentUser.uid : "anon";
    m.q1.instrument_name = m.q1.instrument.name;
    m.q2.instrument_name = m.q2.instrument.name;
    m.q1.instrument_id = m.q1.instrument.id;
    m.q2.instrument_id = m.q2.instrument.id;
    m.match_reported = mismatch.match;
    delete m.q1.instrument;
    delete m.q2.instrument;
    delete m.q1.nearest_match_from_mhc_auto;
    delete m.q2.nearest_match_from_mhc_auto;
    m.model_used = currentModel;
    m.created = serverTimestamp();

    return addDoc(collection(db, "mismatches"), m);
  };
  const prepForFireStore = (harmonisation) => {
    harmonisation.apiData.instruments.map((instrument) =>
      instrument.questions.map(
        (question) =>
          //This is a circular reference but can't be stored
          delete question["instrument"]
      )
    );
    harmonisation.apiData = JSON.parse(JSON.stringify(harmonisation.apiData));
    console.log("prepped");
    console.log(harmonisation);
    return harmonisation;
  };
  const undoPrepForFireStore = (harmonisation) => {
    harmonisation.apiData.instruments.map((instrument) =>
      instrument.questions.map(
        (question) =>
          //This is a circular reference but can't be stored
          (question["instrument"] = instrument)
      )
    );
    console.log("unprepped");
    console.log(harmonisation);
    return harmonisation;
  };

  return (
    <DataProviderContext.Provider
      value={{
        exampleInstruments,
        parse,
        match,
        getVersion,
        getModels,
        currentModel,
        setCurrentModel,
        storeHarmonisation,
        getMyHarmonisations,
        getPublicHarmonisations,
        getSharedInstrument,
        reportMisMatch,
        prepForFireStore,
        reportRating,
      }}
    >
      {children}
    </DataProviderContext.Provider>
  );
}
