/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect } from 'react';
import Spinner from './Spinner';
import { SearchIcon } from './icons';
import { Template } from '../App';


// New component to handle fetching and displaying template image
const TemplateCard: React.FC<{
  template: Template;
  onSelect: (template: Template) => void;
}> = ({ template, onSelect }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleImageLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleImageError = () => {
    setHasError(true);
    setIsLoaded(false);
    console.error(`Failed to load template image: ${template.iconUrl}`);
  };

  return (
    <div
      className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20 hover:border-blue-500/50 hover:-translate-y-1"
      onClick={() => onSelect(template)}
    >
      <div className="cursor-pointer">
        <div className="aspect-video bg-gray-900 overflow-hidden flex items-center justify-center relative">
          {!isLoaded && !hasError && (
            <Spinner className="w-8 h-8 text-gray-500" />
          )}
          {hasError && (
            <div className="text-gray-500 text-center">
              <span className="text-sm">加载失败</span>
            </div>
          )}
          <img 
            src={template.iconUrl} 
            alt={template.name} 
            className={`w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
        <div className="p-4">
          <h3 className="text-xl font-bold text-white truncate">{template.name}</h3>
          <p className="text-gray-400 mt-2 text-sm h-20 overflow-hidden text-ellipsis">
            {template.prompt}
          </p>
        </div>
      </div>
    </div>
  );
};

interface TemplateLibraryPageProps {
    onTemplateSelect: (template: Template) => void;
}

const ITEMS_PER_PAGE = 9;

const TemplateLibraryPage: React.FC<TemplateLibraryPageProps> = ({ onTemplateSelect }) => {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchTemplates = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/templates.json');
                if (!response.ok) throw new Error('Failed to load templates.');
                const data: Template[] = await response.json();
                setTemplates(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    // Reset page to 1 when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Filtering logic
    const filteredTemplates = templates.filter(template =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination logic based on filtered results
    const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentTemplates = filteredTemplates.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (error) {
        return <div className="text-center text-red-400 bg-red-900/50 p-6 rounded-lg">{error}</div>;
    }

    return (
        <div className="w-full max-w-6xl mx-auto p-4 md:p-8 animate-fade-in">
            <div className="text-center mb-8">
                <h2 className="font-['Caveat'] text-5xl md:text-7xl font-bold text-white tracking-wider">Awesome Nano Banana</h2>
                <p className="text-gray-300 text-lg md:text-xl mt-2">NB提示词模板库</p>
            </div>
            
            {/* Search Bar */}
            <div className="mb-8 w-full max-w-2xl mx-auto">
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <SearchIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜索模板名称或提示词..."
                        className="block w-full rounded-lg border-gray-600 bg-gray-900/50 py-3 pl-11 pr-4 text-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none transition-colors"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {currentTemplates.length > 0 ? (
                    currentTemplates.map(template => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onSelect={onTemplateSelect}
                        />
                    ))
                ) : (
                     <div className="col-span-full text-center py-16">
                        <p className="text-gray-400 text-lg">找不到匹配 “<span className="font-semibold text-white">{searchQuery}</span>” 的模板。</p>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-12">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 transition-colors hover:bg-gray-600"
                    >
                        上一页
                    </button>
                    <span className="text-gray-300">
                        第 {currentPage} 页 / 共 {totalPages} 页
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-gray-700 text-white rounded-lg disabled:opacity-50 transition-colors hover:bg-gray-600"
                    >
                        下一页
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateLibraryPage;