'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import HomeIcon from '@heroicons/react/16/solid/HomeIcon';

export default function Navigation() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-primary">
            Generator Monitor
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/devices" className="text-gray-700 hover:text-primary">
              Devices
            </Link>

            {user ? (
              <>
                <Link href="/profile" className="text-gray-700 hover:text-primary">
                  Profile
                </Link>
                <span className="text-gray-600">Welcome, {user.name}</span>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary text-sm"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-primary">
                  Login
                </Link>
                <Link href="/register" className="btn btn-primary text-sm">
                  Register
                </Link>
              </>
            )}
            <Link
              href="/"
              className="text-gray-700 hover:text-primary flex items-center bg-blue-300 p-2 rounded-full"
              title="Home"
            >
              <HomeIcon className="h-5 w-8" />
            </Link>

          </div>
        </div>
      </div>
    </nav>
  );
}
