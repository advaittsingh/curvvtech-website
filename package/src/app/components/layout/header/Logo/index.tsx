import Link from 'next/link';

interface HeaderProps { }
const Logo: React.FC<HeaderProps> = () => {
    return (
        <Link href="/" className="flex items-center shrink-0">
            <span className="text-xl font-semibold text-dark_black dark:text-white">Curvvtech</span>
        </Link>
    );
};

export default Logo;
