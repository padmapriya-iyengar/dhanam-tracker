import { PropsWithChildren, createContext, useContext, useEffect, useState } from 'react';
import * as Network from 'expo-network';

const Context = createContext({ online: true });

export function NetworkProvider({ children }: PropsWithChildren) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const subscription = Network.addNetworkStateListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false));
    Network.getNetworkStateAsync().then((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false));
    return () => subscription.remove();
  }, []);
  return <Context.Provider value={{ online }}>{children}</Context.Provider>;
}

export const useNetwork = () => useContext(Context);
