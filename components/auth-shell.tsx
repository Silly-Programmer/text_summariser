import Link from "next/link";
import { FileText, GraduationCap, ListChecks, NotebookText } from "lucide-react";

const POINTS = [
    { icon: FileText, title: "Upload any PDF", text: "Typed or scanned, even hundreds of pages." },
    { icon: NotebookText, title: "Notes in simple language", text: "Every point comes with its page number." },
    { icon: ListChecks, title: "Quizzes with explanations", text: "Test yourself and see why each answer is right." },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1.1fr]">
            {/* Left: brand panel (desktop only) */}
            <aside
                className="relative hidden flex-col justify-between bg-primary p-12 text-primary-foreground lg:flex"
                style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.13) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                }}
            >
                <Link href="/" className="flex w-fit items-center gap-2 text-lg font-semibold">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15">
                        <GraduationCap className="h-5 w-5" />
                    </span>
                    StudyBuddy
                </Link>

                <div className="max-w-md">
                    <h1 className="text-4xl font-semibold leading-tight tracking-tight">
                        Study smarter from the PDFs you already have.
                    </h1>
                    <ul className="mt-10 space-y-6">
                        {POINTS.map(({ icon: Icon, title, text }) => (
                            <li key={title} className="flex gap-4">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/15">
                                    <Icon className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold">{title}</p>
                                    <p className="text-sm text-primary-foreground/75">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-sm text-primary-foreground/60">Save time. Study what matters.</p>
            </aside>

            {/* Right: form */}
            <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10 lg:min-h-0">
                <Link href="/" className="mb-6 flex items-center gap-2 font-semibold lg:hidden">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <GraduationCap className="h-4 w-4" />
                    </span>
                    StudyBuddy
                </Link>
                {children}
            </main>
        </div>
    );
}