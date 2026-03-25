/**
 * Navbar Component
 * Responsive navigation with dark mode toggle and mobile menu
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { 
  HiOutlineMap, HiOutlineCloudUpload, HiOutlineChartBar, 
  HiOutlineMenu, HiOutlineX, HiOutlineMoon, HiOutlineSun,
  HiOutlineLocationMarker, HiOutlineLogout, HiOutlineUser
} from 'react-icons/hi';

const navLinks = [
  { to: '/', label: 'Map', icon: HiOutlineMap },
  { to: '/upload', label: 'Upload', icon: HiOutlineCloudUpload, auth: true },
  { to: '/route-planner', label: 'Route Planner', icon: HiOutlineLocationMarker },
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-surface-800/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/25 group-hover:shadow-primary-500/40 transition-shadow">
              <span className="text-white text-lg">🛣️</span>
            </div>
            <span className="text-lg font-bold hidden sm:block">
              <span className="gradient-text">Road</span>
              <span className="text-gray-700 dark:text-gray-300">Guard</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              if (link.auth && !user) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive(link.to) 
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark 
                ? <HiOutlineSun className="w-5 h-5 text-yellow-400" /> 
                : <HiOutlineMoon className="w-5 h-5 text-gray-600" />
              }
            </button>

            {/* Auth Buttons */}
            {user ? (
              <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/5">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{user.name?.[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition-colors"
                  title="Logout"
                >
                  <HiOutlineLogout className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex btn-primary !py-2 !px-4 text-sm"
              >
                <HiOutlineUser className="w-4 h-4 mr-1" />
                Sign In
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2.5 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            >
              {mobileOpen ? <HiOutlineX className="w-5 h-5" /> : <HiOutlineMenu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 dark:bg-surface-800/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 animate-fade-in">
          <div className="px-4 py-4 space-y-2">
            {navLinks.map(link => {
              if (link.auth && !user) return null;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all
                    ${isActive(link.to) 
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' 
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  {link.label}
                </Link>
              );
            })}
            {user ? (
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 w-full"
              >
                <HiOutlineLogout className="w-5 h-5" />
                Logout ({user.name})
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10"
              >
                <HiOutlineUser className="w-5 h-5" />
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
