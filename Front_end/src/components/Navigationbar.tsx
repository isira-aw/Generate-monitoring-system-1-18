'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { HomeIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import BoltIcon from '@heroicons/react/24/solid/BoltIcon';

export default function Navigationbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      setIsMenuOpen(false);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Grid for perfect centering */}
        <div className="grid grid-cols-3 items-center h-16">

          {/* Left Side: Logo/Home */}
          <div className="flex items-center justify-start">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <HomeIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-gray-900 hidden xs:block">
                GenMonitor
              </span>
            </Link>
          </div>

          {/* CENTER: Brand Name */}
          <div className="flex justify-center items-center">
            <BoltIcon className="h-6 w-6 text-blue-600" />
            <span className="text-[16pt] font-extrabold tracking-wide">
              <span className="text-blue-600">Live</span>
              <span className="text-gray-900">Gen</span>
            </span>
          </div>

          {/* Right Side: Navigation & User Info */}
          <div className="flex items-center justify-end">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/devices" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                Devices
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                    Profile
                  </Link>
                  {/* Welcome Message */}
                  <span className="text-sm text-gray-500 italic">
                    Welcome, {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-blue-600">
                    Login
                  </Link>
                  <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-shadow">
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-gray-100 bg-white shadow-xl`}>
        <div className="px-4 pt-2 pb-6 space-y-1 text-center">
          <Link
            href="/devices"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-4 text-base font-medium text-gray-700 border-b border-gray-50"
          >
            Devices
          </Link>

          {user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-4 text-base font-medium text-gray-700 border-b border-gray-50"
              >
                Profile
              </Link>
              <div className="px-3 py-4 bg-gray-50 rounded-lg mt-2">
                <p className="text-sm text-gray-600 mb-3 font-medium">
                  Welcome, <span className="font-bold text-gray-900">{user.name}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full text-center bg-red-500 text-white py-3 rounded-lg font-bold hover:bg-red-600 transition-colors"
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
                className="w-full text-center py-3 border border-gray-300 rounded-lg font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-3 bg-blue-600 text-white rounded-lg font-medium"
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