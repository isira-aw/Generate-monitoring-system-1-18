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
    <nav className="fixed top-0 left-0 w-full bg-[#1E40AF] border-b border-[#1E40AF] z-[100]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Grid for perfect centering */}
        <div className="grid grid-cols-3 items-center h-16">

          {/* Left Side: Logo/Home */}
          <div className="flex items-center justify-start">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-[#d9d9d9] p-1.5 rounded-lg">
                <HomeIcon className="h-5 w-5 text-[#1E40AF]" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#d9d9d9] hidden xs:block">
                GenMonitor
              </span>
            </Link>
          </div>

          {/* CENTER: Brand Name */}
          <div className="flex justify-center items-center">
            <BoltIcon className="h-6 w-6 text-[#d9d9d9]" />
            <span className="text-[16pt] font-extrabold tracking-wide">
              <span className="text-[#d9d9d9]">Live</span>
              <span className="text-white">Gen</span>
            </span>
          </div>

          {/* Right Side: Navigation & User Info */}
          <div className="flex items-center justify-end">
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-6">
              <Link href="/devices" className="text-sm font-medium text-[#d9d9d9] hover:text-white">
                Devices
              </Link>
              {user ? (
                <>
                  <Link href="/profile" className="text-sm font-medium text-[#d9d9d9] hover:text-white">
                    Profile
                  </Link>
                  {/* Welcome Message */}
                  <span className="text-sm text-[#d9d9d9]/80 italic">
                    Welcome, {user.name}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-[#d9d9d9] hover:bg-white text-[#1E40AF] px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-[#d9d9d9] hover:text-white">
                    Login
                  </Link>
                  <Link href="/register" className="bg-[#d9d9d9] hover:bg-white text-[#1E40AF] px-4 py-2 rounded-md text-sm font-medium transition-shadow">
                    Register
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Toggle Button */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-md text-[#d9d9d9] hover:bg-[#1E40AF]/80"
              >
                {isMenuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} border-t border-[#d9d9d9]/20 bg-[#1E40AF] shadow-xl`}>
        <div className="px-4 pt-2 pb-6 space-y-1 text-center">
          <Link
            href="/devices"
            onClick={() => setIsMenuOpen(false)}
            className="block px-3 py-4 text-base font-medium text-[#d9d9d9] border-b border-[#d9d9d9]/20"
          >
            Devices
          </Link>

          {user ? (
            <>
              <Link
                href="/profile"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-4 text-base font-medium text-[#d9d9d9] border-b border-[#d9d9d9]/20"
              >
                Profile
              </Link>
              <div className="px-3 py-4 bg-[#1E40AF]/80 rounded-lg mt-2">
                <p className="text-sm text-[#d9d9d9] mb-3 font-medium">
                  Welcome, <span className="font-bold text-white">{user.name}</span>
                </p>
                <button
                  onClick={handleLogout}
                  className="w-full text-center bg-[#d9d9d9] text-[#1E40AF] py-3 rounded-lg font-bold hover:bg-white transition-colors"
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
                className="w-full text-center py-3 border border-[#d9d9d9] text-[#d9d9d9] rounded-lg font-medium"
              >
                Login
              </Link>
              <Link
                href="/register"
                onClick={() => setIsMenuOpen(false)}
                className="w-full text-center py-3 bg-[#d9d9d9] text-[#1E40AF] rounded-lg font-medium"
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
