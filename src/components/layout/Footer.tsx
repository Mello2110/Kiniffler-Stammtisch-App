export function Footer() {
    return (
        <footer className="w-full border-t border-border py-6 text-center text-sm text-muted-foreground">
            <div className="container mx-auto px-4">
                <p>&copy; {new Date().getFullYear()} Stammtisch Dashboard. All rights reserved.</p>
            </div>
        </footer>
    );
}
