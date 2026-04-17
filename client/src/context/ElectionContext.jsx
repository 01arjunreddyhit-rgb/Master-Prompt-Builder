import React, { createContext, useContext, useState, useEffect } from 'react';

const ElectionContext = createContext();

export const useElection = () => useContext(ElectionContext);

export const ElectionProvider = ({ children }) => {
  const [selectedElection, setSelectedElection] = useState(() => {
    const saved = localStorage.getItem('selected_election');
    return saved ? JSON.parse(saved) : null;
  });

  const selectElection = (election) => {
    setSelectedElection(election);
    if (election) {
      localStorage.setItem('selected_election', JSON.stringify(election));
    } else {
      localStorage.removeItem('selected_election');
    }
  };

  return (
    <ElectionContext.Provider value={{ selectedElection, selectElection }}>
      {children}
    </ElectionContext.Provider>
  );
};
