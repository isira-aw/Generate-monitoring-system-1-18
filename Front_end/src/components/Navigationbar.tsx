'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { HomeIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import BoltIcon from '@heroicons/react/24/solid/BoltIcon';

export default function Navigationbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const isHomepage = pathname === '/';

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const homepageNavStyles = "fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-[100]";
  const themeNavStyles = "fixed top-0 left-0 w-full bg-[#d9d9d9] border-b border-gray-300 z-[100]";

  return (
    <nav className={isHomepage ? homepageNavStyles : themeNavStyles}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 items-center h-16">

          <div className="flex items-center justify-start">
            <Link href="/" className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#1E40AF]">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#1E40AF] hidden xs:block">
                GenMonitor
              </span>
            </Link>
          </div>

          <div className="flex justify-center items-center">
            <BoltIcon className="h-6 w-6 text-[#1E40AF]" />
            <span className="text-[16pt] font-extrabold tracking-wide text-[#1E40AF]">
              <span className="text-[#1E40AF]">Live</span>
              <span className="text-gray-600">Gen</span>
            </span>
          </div>

          <div className="flex items-center justify-end">
            <div className="hidden md:flex items-center gap-6">
              <Link href="/devices" className="text-sm font-medium text-[#1E40AF] hover:text-blue-700">
                Devices
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="text-sm font-medium text-[#1E40AF] hover:text-blue-700">
                    Profile
                  </Link>
                  <span className="text-sm text-gray-600 italic">
                    Welcome, {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-[#1E40AF] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-[#1E40AF] hover:text-blue-700">
                    Login
                  </Link>
                  <Link href="/register" className="bg-[#1E40AF] hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-shadow">
                    Register
                  </Link>
                </div>
              )}
            </div>

            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-[#1E40AF] hover:bg-gray-200"
              >
                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-gray-200 bg-white shadow-xl`}>
        <div className="px-4 pt-2 pb-6 space-y-1 text-center">
          <Link
            href="/devices"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-4 text-base font-medium text-[#1E40AF] border-b border-gray-50"
          >
            Devices
          </Link>

          {user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-4 text-base font-medium text-[#1E40AF] border-b border-gray-50"
              >
                Profile
              </Link>
              <div className="px-3 py-4 bg-gray-50 rounded-lg mt-2">
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  Welcome, <span className="font-bold text-[#1E40AF]">{user.name}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full text-center bg-[#1E40AF] text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <div className="pt-4 flex flex-col gap-3 px-3">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-3 border border-[#1E40AF] text-[#1E40AF] rounded-lg font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-3 bg-[#1E40AF] text-white rounded-lg font-medium"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
