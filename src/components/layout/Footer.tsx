export function Footer() {
    return (
        <footer className="w-full border-t border-border py-6 text-sm text-muted-foreground bg-background/50 backdrop-blur-sm">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                    <img src="/kanpai-logo.png" alt="KANPAI" className="h-6 w-6 object-contain" />
                    <span className="text-xs font-bold tracking-widest text-[#8B5CF6]">KANPAI</span>
                </div>
                <p>&copy; {new Date().getFullYear()} Stammtisch Dashboard. All rights reserved.</p>
            </div>
        </footer>
    );
}
