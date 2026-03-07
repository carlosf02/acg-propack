import { createContext, useContext, useState, ReactNode } from "react";
import { MeResponse } from "./auth.api";

export interface AuthContextType {
    user: MeResponse | null;
    setUser: (user: MeResponse | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<MeResponse | null>(null);

    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}
