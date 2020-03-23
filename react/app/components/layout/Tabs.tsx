import React, { createContext, useContext, useState, useMemo } from "react";

import localStorageManager from "util/localStorage";
import cn from "classnames";

const TabsContext = createContext({ currentTab: "", setTab: val => {}, localStorageName: "" });

export const Tabs = ({ defaultTab, localStorageName, children }) => {
  const [currentTab, setTab] = useState(localStorageManager.get(localStorageName) || defaultTab);
  const packet = useMemo(() => ({ localStorageName, currentTab, setTab }), [currentTab, localStorageName]);

  return <TabsContext.Provider value={packet}>{children}</TabsContext.Provider>;
};

export const TabHeaders = ({ children }) => {
  return <div className="tab-headers">{children}</div>;
};

export const TabHeader = ({ children, tabName = "", disabled = false }) => {
  const { currentTab, setTab, localStorageName } = useContext(TabsContext);
  const onClick = disabled
    ? () => {}
    : () => {
        if (localStorageName) {
          localStorageManager.set(localStorageName, tabName);
        }
        setTab(tabName);
      };

  return (
    <div onClick={onClick} className={cn("tab-header", { disabled, active: tabName == currentTab })}>
      {children}
    </div>
  );
};

export const TabContents = ({ children }) => <div className="tab-content">{children}</div>;

export const TabContent = ({ children, tabName = "", className = "", ...rest }) => {
  const { currentTab } = useContext(TabsContext);

  return (
    <div {...rest} className={cn("tab-pane", className, { active: currentTab == tabName })}>
      {children}
    </div>
  );
};
