export function Footer() {
    return (
        <footer className="w-full border-t border-border py-6 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm">
            <div className="w-full px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity justify-self-start">
                    <img src="/kanpai-logo.png" alt="KANPAI" className="h-6 w-6 object-contain" />
                    <span className="text-xs font-bold tracking-widest text-[#8B5CF6]">KANPAI</span>
                </div>
                <p className="justify-self-center text-center whitespace-nowrap">&copy; {new Date().getFullYear()} Stammtisch Dashboard. All rights reserved.</p>
            </div>
        </footer>
    );
}
