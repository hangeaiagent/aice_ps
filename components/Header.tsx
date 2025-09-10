/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { SparkleIcon, GitHubIcon, ClockIcon, FilmIcon, CogIcon, QuestionMarkCircleIcon, TemplateLibraryIcon } from './icons';
import { type View } from '../App';
import { useAuth } from '../contexts/AuthContext';
import AuthModal from './AuthModal';
import UserMenu from './UserMenu';

interface HeaderProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, onViewChange, onOpenSettings, onOpenHelp }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <>
      <header className="w-full py-4 px-4 sm:px-8 border-b border-gray-700 bg-gray-800/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => onViewChange('editor')} className={`flex items-center gap-3 transition-colors p-2 -m-2 rounded-lg ${activeView === 'editor' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                  <SparkleIcon className="w-6 h-6 text-blue-400" />
                  <h1 className="text-xl font-bold tracking-tight">
                    Aice PS
                  </h1>
                </button>

                <div className="h-6 w-px bg-gray-600"></div>

                <button onClick={() => onViewChange('past-forward')} className={`flex items-center gap-3 transition-colors p-2 -m-2 rounded-lg ${activeView === 'past-forward' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                  <ClockIcon className="w-6 h-6 text-yellow-400" />
                  <h1 className="text-xl font-bold tracking-tight font-['Caveat']">
                    Past Forward
                  </h1>
                </button>

                <div className="h-6 w-px bg-gray-600"></div>

                <button onClick={() => onViewChange('beatsync')} className={`flex items-center gap-3 transition-colors p-2 -m-2 rounded-lg ${activeView === 'beatsync' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                  <FilmIcon className="w-6 h-6 text-purple-400" />
                  <h1 className="text-xl font-bold tracking-tight">
                    音画志
                  </h1>
                </button>
                
                <div className="h-6 w-px bg-gray-600"></div>

                <button onClick={() => onViewChange('template-library')} className={`flex items-center gap-3 transition-colors p-2 -m-2 rounded-lg ${activeView === 'template-library' ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                  <TemplateLibraryIcon className="w-6 h-6 text-green-400" />
                  <h1 className="text-xl font-bold tracking-tight font-['Permanent_Marker']">
                    NB 提示词库
                  </h1>
                </button>

                <div className="h-6 w-px bg-gray-600"></div>
                
                <a href="https://nb.kuai.host/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 transition-colors p-2 -m-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
                  <h1 className="text-xl font-bold tracking-tight">
                    【自部署版本APP】国内可用
                  </h1>
                </a>

            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenHelp}
                className="p-2 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                aria-label="帮助"
                title="帮助"
              >
                <QuestionMarkCircleIcon className="w-6 h-6" />
              </button>
              <button
                onClick={onOpenSettings}
                className="p-2 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                aria-label="API 设置"
                title="API 设置"
              >
                <CogIcon className="w-6 h-6" />
              </button>
              <a
                href="https://github.com/aigem/aice_ps"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 rounded-full hover:bg-white/10 hover:text-white transition-colors"
                aria-label="GitHub Repository"
                title="GitHub Repository"
              >
                <GitHubIcon className="w-6 h-6" />
              </a>
              
              {/* 认证状态显示 */}
              <div className="ml-2 pl-2 border-l border-gray-600">
                {isLoading ? (
                  <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse"></div>
                ) : isAuthenticated ? (
                  <UserMenu />
                ) : (
                  <button
                    onClick={() => setIsAuthModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    登录
                  </button>
                )}
              </div>
            </div>
        </div>
      </header>

      {/* 认证模态框 */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </>
  );
};

export default Header;