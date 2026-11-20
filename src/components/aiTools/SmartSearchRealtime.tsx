import React, { useState, useEffect, useCallback } from 'react';
import { Search, User, Building, DollarSign, Loader2 } from 'lucide-react';
import { useContactStore } from '../../store/contactStore';
import { useDealStore } from '../../store/dealStore';
import { openaiEmbeddingsService } from '../../services/openaiEmbeddingsService';
import { useTheme } from '../../contexts/ThemeContext';

import { stageName } from '../../utils/dealStage';
interface SearchResult {
  type: 'contact' | 'deal' | 'company';
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  value: string;
  matchReason?: string;
}

const SmartSearchRealtime: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [enhancedResults, setEnhancedResults] = useState(false);
  
  const { contacts } = useContactStore();
  const { deals } = useDealStore();
  const { isDark } = useTheme();
  
  // Debounced search function
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      
      setIsSearching(true);
      
      try {
        // First perform basic filtering
        const filteredContacts = Object.values(contacts).filter(contact => 
          contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (contact.company && contact.company.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        
        const filteredDeals = Object.values(deals).filter(deal => 
          deal.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        // Create unique companies from contacts
        const uniqueCompanies = Array.from(new Set(
          Object.values(contacts)
            .filter(c => c.company && c.company.toLowerCase().includes(searchQuery.toLowerCase()))
            .map(c => c.company)
        ));
        
        // Map to search results
        const basicResults: SearchResult[] = [
          ...filteredContacts.map(contact => ({
            type: 'contact' as const,
            id: contact.id,
            title: contact.name,
            subtitle: contact.title || contact.position ? `${contact.title || contact.position}${contact.company ? ` at ${contact.company}` : ''}` : '',
            icon: User,
            value: (contact.interestLevel === 'hot' || contact.status === 'hot') ? 'High Value' : 'Contact'
          })),
          ...filteredDeals.map(deal => ({
            type: 'deal' as const,
            id: deal.id,
            title: deal.title,
            subtitle: `Stage: ${stageName(deal)}`,
            icon: DollarSign,
            value: `$${deal.value.toLocaleString()}`
          })),
          ...uniqueCompanies.map((company, index) => {
            // Filter contacts for this company
            const companyContacts = Object.values(contacts).filter(c => c.company === company);
            // Filter deals with contacts from this company
            const companyDeals = Object.values(deals).filter(d => {
              const contact = contacts[d.contactId];
              return contact && contact.company === company;
            });
            
            return {
              type: 'company' as const,
              id: `company-${index}`,
              title: company || '',
              subtitle: `${companyContacts.length} contacts, ${companyDeals.length} deals`,
              icon: Building,
              value: companyDeals.length > 0 
                ? `$${companyDeals.reduce((sum, d) => sum + d.value, 0).toLocaleString()} potential`
                : 'No active deals'
            };
          })
        ];
        
        // Use limited basic results first for quick response
        setResults(basicResults.slice(0, 5));
        
        // Semantic (embedding) search finds matches the keyword filter misses,
        // e.g. "warm leads in healthcare" or "big deals about to close".
        setEnhancedResults(false);
        if (searchQuery.trim().length >= 4) {
          try {
            const allContacts = Object.values(contacts) as any[];
            const allDeals = Object.values(deals) as any[];
            const [contactHits, dealHits] = await Promise.all([
              openaiEmbeddingsService.searchContacts(searchQuery, allContacts, 5),
              openaiEmbeddingsService.searchDeals(searchQuery, allDeals, 5),
            ]);
            const seen = new Set(basicResults.map(r => `${r.type}:${r.id}`));
            const semantic: SearchResult[] = [
              ...contactHits.filter(h => h.score > 0.3).map(({ item: c, score }) => ({
                type: 'contact' as const,
                id: c.id,
                title: c.name,
                subtitle: [c.title || c.position, c.company].filter(Boolean).join(' at '),
                icon: User,
                value: 'Contact',
                matchReason: `Semantic match (${Math.round(score * 100)}%)`,
              })),
              ...dealHits.filter(h => h.score > 0.3).map(({ item: d, score }) => ({
                type: 'deal' as const,
                id: d.id,
                title: d.title,
                subtitle: `Stage: ${stageName(d)}`,
                icon: DollarSign,
                value: `$${Number(d.value || 0).toLocaleString()}`,
                matchReason: `Semantic match (${Math.round(score * 100)}%)`,
              })),
            ].filter(r => !seen.has(`${r.type}:${r.id}`));
            if (semantic.length) {
              setResults([...basicResults.slice(0, 5), ...semantic].slice(0, 10));
              setEnhancedResults(true);
            }
          } catch (aiError) {
            console.error('Semantic search failed:', aiError);
            // Keyword results stay on screen.
          }
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [contacts, deals]
  );

  // Effect for debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query) {
        debouncedSearch(query);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [query, debouncedSearch]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    if (!searchQuery.trim()) {
      setResults([]);
      setEnhancedResults(false);
    }
  };

  return (
    <div className="p-4 h-full">
      <div className="relative mb-4">
        <Search size={16} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
          isDark ? 'text-gray-500' : 'text-gray-400'
        }`} />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search contacts, deals, companies..."
          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
            isDark 
              ? 'bg-gray-800/60 border-gray-700 text-white placeholder:text-gray-500' 
              : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'
          }`}
        />
        {isSearching && (
          <Loader2 size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      <div className="space-y-2">
        {results.length > 0 ? (
          <div>
            {enhancedResults && (
              <div className={`px-3 py-1 rounded mb-2 text-xs ${
                isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-700'
              }`}>
                AI-enhanced search results
              </div>
            )}
          
            {results.map((result) => (
              <div
                key={result.id}
                className={`p-3 border rounded-lg transition-colors cursor-pointer ${
                  isDark 
                    ? 'border-gray-700 bg-gray-800/60 hover:bg-gray-700/80' 
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    result.type === 'contact' 
                      ? (isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                      : result.type === 'deal'
                      ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600')
                      : (isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-600')
                  }`}>
                    <result.icon size={16} />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {result.title}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {result.subtitle}
                    </p>
                    {result.matchReason && (
                      <p className={`text-xs mt-1 ${
                        isDark ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50'
                      } px-2 py-0.5 rounded-sm inline-block`}>
                        {result.matchReason}
                      </p>
                    )}
                  </div>
                  <div className={`text-xs whitespace-nowrap ${
                    result.type === 'deal' 
                      ? (isDark ? 'text-green-400' : 'text-green-600')
                      : (isDark ? 'text-gray-400' : 'text-gray-600')
                  }`}>
                    {result.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : query ? (
          <div className="text-center py-8">
            <Search size={32} className={`mx-auto text-gray-300 mb-3`} />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No results found for "{query}"
            </p>
          </div>
        ) : (
          <div className="text-center py-8">
            <Search size={32} className={`mx-auto text-gray-300 mb-3`} />
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Start typing to search...
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-2`}>
              Powered by AI semantic search
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartSearchRealtime;