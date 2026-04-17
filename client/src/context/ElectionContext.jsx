import React, { createContext, useContext, useState, useEffect } from 'react';

const ElectionContext = createContext();

export const useElection = () => useContext(ElectionContext);

export const ElectionProvider = ({ children }) => {
  const [selectedElection, setSelectedElection] = useState(() => {
    const saved = localStorage.getItem('selectedElection');
    return saved ? JSON.parse(saved) : null;
  });
  const [isTransitioning, setIsTransitioning] = useState(false);

  const selectElection = (election) => {
    setIsTransitioning(true);
    setSelectedElection(election);
    if (election) {
      localStorage.setItem('selected_election', JSON.stringify(election));
    } else {
      localStorage.removeItem('selected_election');
    }
    // Artificial delay for smooth UI transition
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const clearWorkspace = () => {
    selectElection(null);
  };

  return (
    <ElectionContext.Provider value={{ selectedElection, selectElection, clearWorkspace, isTransitioning }}>
      {children}
    </ElectionContext.Provider>
  );
};
