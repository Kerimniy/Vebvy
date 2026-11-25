import React, { useState } from 'react';

import { Button } from "../components/ui/button";
import {
    Card,

} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Link } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { PasswordInput } from "@/components/PasswordInput";
import { Loader2 } from "lucide-react";
import { useAuth } from '@/components/Auth';

import { authService } from "@/lib/user"
import { useNavigate } from 'react-router-dom';
export default function AuthPage() {
    const navigate = useNavigate()
    const { updateUser } = useAuth();


    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);

    const validateEmail = (emailStr: string) => /^\S+@\S+\.\S+$/.test(emailStr);
    const isPasswordValid = password.length >= 6;
    const isCodeValid = code.length === 6;

    const isLoginDisabled = isLoading || !validateEmail(email) || !isPasswordValid;
    const isRegisterDisabled = isLoading || !validateEmail(email) || !isPasswordValid || !isCodeValid;
    const isResetDisabled = isLoading || !validateEmail(email) || !isPasswordValid || !isCodeValid;

    const startRequest = () => {
        setIsLoading(true);
        setStatusMessage(null);
    };

    const registerSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        startRequest()
        try {
            await authService.register({ email, password, code })
            setStatusMessage({ text: "Success", isError: false })
            await updateUser()
            navigate("/")
        } catch (err) {
            setStatusMessage({ text: err instanceof Error ? err.message : "Registration error", isError: true })
        } finally {
            setIsLoading(false)
        }
    }

    const loginSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        startRequest()
        try {
            await authService.login({ email, password })
            setStatusMessage({ text: "Success", isError: false })
            await updateUser()
            navigate("/")
        } catch (err) {
            setStatusMessage({ text: err instanceof Error ? err.message : "Login error", isError: true })
        } finally {
            setIsLoading(false)
        }
    }

    const resetSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        startRequest()
        try {
            await authService.resetPassword({ email, code, newPassword: password })
            setStatusMessage({ text: "Password changed, sign in", isError: false })
            navigate("/-/auth/sign-in")
        } catch (err) {
            setStatusMessage({ text: err instanceof Error ? err.message : "Password reset error", isError: true })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSendCode = async () => {
        if (!validateEmail(email)) {
            setStatusMessage({ text: "Enter valid email", isError: true })
            return
        }
        setIsLoading(true)
        setStatusMessage(null)
        try {
            await authService.sendCode()
            setStatusMessage({ text: "Code has been sent", isError: false })
        } catch (err) {
            setStatusMessage({ text: err instanceof Error ? err.message : "Code has not been sent", isError: true })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex-col flex gap-4 w-full justify-center items-center min-h-[500px]">

            {statusMessage && (
                <div className={`p-3 rounded-md text-sm font-medium border max-w-sm w-full text-center ${statusMessage.isError
                    ? 'bg-destructive/10 text-destructive border-destructive/20'
                    : 'bg-green-500/10 text-green-600 border-green-500/20'
                    }`}>
                    {statusMessage.text}
                </div>
            )}

            <Routes>


                <Route path="/sign-up" element={
                    <Card className="p-6 pt-0 w-full max-w-sm bg-glass">
                        <div className="flex flex-row justify-between p-4 pt-6 pb-2">
                            <p className="text-lg font-semibold">Sign up</p>
                            <Link className="text-base text-primary hover:underline" to="/-/auth/sign-in">back to log in</Link>
                        </div>
                        <form onSubmit={registerSubmit} className="p-4 flex flex-col gap-4">
                            <Input
                                placeholder="Email"
                                type="email"
                                value={email}
                                onChange={(e) => { console.log(); setEmail(e.target.value) }}
                                required
                            />
                            <PasswordInput
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password (min. 6 chars.)"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendCode()}
                                disabled={isLoading || !validateEmail(email)}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                            </Button>

                            <Input
                                placeholder="Enter code"
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />

                            <Button type="submit" disabled={isRegisterDisabled}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Sign up
                            </Button>
                        </form>
                    </Card>
                } />

                <Route path="/sign-in" element={
                    <Card className="p-6 pt-0 w-full max-w-sm bg-glass">
                        <div className="flex flex-row justify-between p-4 pt-6 pb-2">
                            <p className="text-lg font-semibold">Log in</p>
                        </div>
                        <div className="p-4">
                            <form onSubmit={loginSubmit} className="flex flex-col gap-4">
                                <Input
                                    placeholder="Email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <PasswordInput
                                    value={password}
                                    placeholder="Password"
                                    onChange={(e) => setPassword(e.target.value)}
                                />

                                <div className="text-right">
                                    <Link to="/-/auth/reset" className="text-xs text-muted-foreground hover:text-primary hover:underline">
                                        Reset password
                                    </Link>
                                </div>

                                <Button type="submit" disabled={isLoginDisabled}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Log in
                                </Button>
                            </form>
                        </div>
                    </Card>
                } />

                <Route path="/reset" element={
                    <Card className="p-6 pt-0 w-full max-w-sm bg-glass">
                        <div className="flex flex-row justify-between p-4 pt-6 pb-2">
                            <p className="text-lg font-semibold">Reset password</p>
                            <Link className="text-base text-primary hover:underline" to="/-/auth/sign-in">back to log in</Link>
                        </div>
                        <form onSubmit={resetSubmit} className="p-4 flex flex-col gap-4">
                            <Input
                                placeholder="Email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <PasswordInput
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="New password (min. 6 chars.)"
                            />

                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => handleSendCode()}
                                disabled={isLoading || !validateEmail(email)}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send code"}
                            </Button>

                            <Input
                                placeholder="Enter code"
                                type="text"
                                maxLength={6}
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                            />

                            <Button type="submit" disabled={isResetDisabled}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Change password
                            </Button>
                        </form>
                    </Card>
                } />
            </Routes>
        </div>
    );
}