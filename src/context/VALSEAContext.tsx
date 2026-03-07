"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface VALSEAState {
    transcript: { role: "user" | "assistant"; text: string }[];
    emotions: {
        frustration: number;
        anxiety: number;
        politeness: number;
    };
    security: {
        deepfakeProb: number;
        threatFlag: boolean;
    };
    cognitive: {
        status: string;
        intent: string;
        translation: string;
        cultural_context: string;
        fraud_verdict: string;
        action_advised: string;
    } | null;
    isCalling: boolean;
}

interface VALSEAContextType {
    state: VALSEAState;
    updateTranscript: (role: "user" | "assistant", text: string) => void;
    updateEmotions: (emotions: Partial<VALSEAState["emotions"]>) => void;
    updateSecurity: (security: Partial<VALSEAState["security"]>) => void;
    updateCognitive: (cognitive: VALSEAState["cognitive"]) => void;
    setIsCalling: (isCalling: boolean) => void;
    resetState: () => void;
}

const initialState: VALSEAState = {
    transcript: [],
    emotions: {
        frustration: 0,
        anxiety: 0,
        politeness: 0,
    },
    security: {
        deepfakeProb: 0,
        threatFlag: false,
    },
    cognitive: null,
    isCalling: false,
};

const VALSEAContext = createContext<VALSEAContextType | undefined>(undefined);

export function VALSEAProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<VALSEAState>(initialState);

    const updateTranscript = (role: "user" | "assistant", text: string) => {
        setState((prev) => ({
            ...prev,
            transcript: [...prev.transcript, { role, text }].slice(-5), // Keep last 5 for demo
        }));
    };

    const updateEmotions = (emotions: Partial<VALSEAState["emotions"]>) => {
        setState((prev) => ({
            ...prev,
            emotions: { ...prev.emotions, ...emotions },
        }));
    };

    const updateSecurity = (security: Partial<VALSEAState["security"]>) => {
        setState((prev) => ({
            ...prev,
            security: { ...prev.security, ...security },
        }));
    };

    const updateCognitive = (cognitive: VALSEAState["cognitive"]) => {
        setState((prev) => ({ ...prev, cognitive }));
    };

    const setIsCalling = (isCalling: boolean) => {
        setState((prev) => ({ ...prev, isCalling }));
    };

    const resetState = () => {
        setState(initialState);
    };

    return (
        <VALSEAContext.Provider
            value={{
                state,
                updateTranscript,
                updateEmotions,
                updateSecurity,
                updateCognitive,
                setIsCalling,
                resetState,
            }}
        >
            {children}
        </VALSEAContext.Provider>
    );
}

export function useVALSEA() {
    const context = useContext(VALSEAContext);
    if (context === undefined) {
        throw new Error("useVALSEA must be used within a VALSEAProvider");
    }
    return context;
}
