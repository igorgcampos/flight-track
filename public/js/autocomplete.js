// Dynamic Autocomplete System for Aviation App

class DynamicAutocomplete {
    constructor() {
        this.debounceTimeout = null;
        this.activeDropdown = null;
        this.init();
    }

    init() {
        this.setupAutocompleteFields();
        this.preloadCache();
    }

    async preloadCache() {
        try {
            console.log('🚀 Precarregando cache de dados...');
            const response = await fetch('/api/cache/preload');
            const data = await response.json();
            console.log(`✅ Cache precarregado: ${data.airports_count} aeroportos, ${data.airlines_count} companhias`);
        } catch (error) {
            console.log('⚠️ Preload do cache falhou, mas autocomplete ainda funcionará');
        }
    }

    setupAutocompleteFields() {
        // Setup para campo de companhia aérea
        this.setupField('airline', 'airlines');
        
        // Setup para campos de aeroportos
        this.setupField('departure', 'airports');
        this.setupField('arrival', 'airports');
    }

    setupField(inputId, dataType) {
        const input = document.getElementById(inputId);
        if (!input) return;

        // Criar container do autocomplete
        const container = document.createElement('div');
        container.className = 'autocomplete-container';
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);

        // Criar dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown hidden';
        dropdown.id = `${inputId}-dropdown`;
        container.appendChild(dropdown);

        // Event listeners
        input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            this.handleInput(query, dropdown, dataType, input);
        });

        input.addEventListener('focus', (e) => {
            const query = e.target.value.trim();
            if (query.length >= 1) {
                this.handleInput(query, dropdown, dataType, input);
            }
        });

        input.addEventListener('blur', () => {
            // Delay para permitir clique no dropdown
            setTimeout(() => this.hideDropdown(dropdown), 200);
        });

        // Adicionar ícone de busca
        this.addSearchIcon(container, input);
    }

    addSearchIcon(container, input) {
        const iconWrapper = document.createElement('div');
        iconWrapper.className = 'absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none';
        iconWrapper.innerHTML = '<i data-lucide="search" class="w-4 h-4 text-gray-400"></i>';
        
        container.style.position = 'relative';
        container.appendChild(iconWrapper);
        
        // Ajustar padding do input para dar espaço ao ícone
        input.style.paddingRight = '2.5rem';
    }

    handleInput(query, dropdown, dataType, input) {
        // Clear previous timeout
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        // Debounce search
        this.debounceTimeout = setTimeout(() => {
            if (query.length >= 1) {
                this.performSearch(query, dropdown, dataType, input);
            } else {
                this.hideDropdown(dropdown);
            }
        }, 300); // 300ms delay
    }

    async performSearch(query, dropdown, dataType, input) {
        try {
            // Show loading state
            this.showLoading(dropdown);
            
            const response = await fetch(`/api/autocomplete/${dataType}?q=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();
            
            if (data.data && data.data.length > 0) {
                this.showResults(dropdown, data.data, dataType, input);
            } else {
                this.showNoResults(dropdown, query);
            }
            
        } catch (error) {
            this.showError(dropdown, error.message);
        }
    }

    showLoading(dropdown) {
        dropdown.innerHTML = `
            <div class="autocomplete-item text-center">
                <div class="flex items-center justify-center py-2">
                    <div class="loading-spinner mr-2"></div>
                    <span class="text-sm text-gray-600">Buscando...</span>
                </div>
            </div>
        `;
        dropdown.classList.remove('hidden');
    }

    showResults(dropdown, results, dataType, input) {
        const isAirline = dataType === 'airlines';
        
        dropdown.innerHTML = results.map((item, index) => {
            const displayName = item.airport_name || item.airline_name || 'Nome não informado';
            const code = item.iata_code || item.icao_code || '';
            const location = isAirline ? 
                (item.country_name || '') : 
                `${item.city_name || ''}, ${item.country_name || ''}`.replace(/^,\s*/, '');

            return `
                <div class="autocomplete-item" 
                     data-code="${code}" 
                     data-name="${displayName}"
                     data-index="${index}">
                    <div class="flex items-center justify-between">
                        <div class="flex-1 min-w-0">
                            <div class="font-medium text-gray-900 truncate">${displayName}</div>
                            <div class="text-sm text-gray-500 truncate">
                                ${location}
                            </div>
                        </div>
                        <div class="flex-shrink-0 ml-2">
                            <span class="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">${code}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click listeners
        dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
            item.addEventListener('click', () => {
                const code = item.dataset.code;
                const name = item.dataset.name;
                
                input.value = code;
                input.setAttribute('data-full-name', name);
                input.setAttribute('title', name);
                
                this.hideDropdown(dropdown);
                
                // Trigger change event for any listeners
                input.dispatchEvent(new Event('change'));
            });

            // Keyboard navigation support
            item.addEventListener('mouseenter', () => {
                dropdown.querySelectorAll('.autocomplete-item').forEach(i => i.classList.remove('bg-gray-50'));
                item.classList.add('bg-gray-50');
            });
        });

        dropdown.classList.remove('hidden');
        this.activeDropdown = dropdown;
    }

    showNoResults(dropdown, query) {
        dropdown.innerHTML = `
            <div class="autocomplete-item text-center">
                <div class="py-3">
                    <i data-lucide="search-x" class="w-5 h-5 text-gray-400 mx-auto mb-2"></i>
                    <div class="text-sm text-gray-600">Nenhum resultado para "${query}"</div>
                    <div class="text-xs text-gray-500 mt-1">Tente digitar o código IATA (ex: GRU, JFK)</div>
                </div>
            </div>
        `;
        dropdown.classList.remove('hidden');
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    showError(dropdown, error) {
        dropdown.innerHTML = `
            <div class="autocomplete-item text-center">
                <div class="py-3">
                    <i data-lucide="alert-circle" class="w-5 h-5 text-red-400 mx-auto mb-2"></i>
                    <div class="text-sm text-red-600">Erro na busca</div>
                    <div class="text-xs text-gray-500 mt-1">${error}</div>
                </div>
            </div>
        `;
        dropdown.classList.remove('hidden');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    hideDropdown(dropdown) {
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
        this.activeDropdown = null;
    }

    // Keyboard navigation (optional enhancement)
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            if (!this.activeDropdown || this.activeDropdown.classList.contains('hidden')) return;

            const items = this.activeDropdown.querySelectorAll('.autocomplete-item');
            const activeItem = this.activeDropdown.querySelector('.bg-gray-50');
            let activeIndex = activeItem ? Array.from(items).indexOf(activeItem) : -1;

            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    activeIndex = Math.min(activeIndex + 1, items.length - 1);
                    this.highlightItem(items, activeIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    activeIndex = Math.max(activeIndex - 1, 0);
                    this.highlightItem(items, activeIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (activeItem) {
                        activeItem.click();
                    }
                    break;
                case 'Escape':
                    this.hideDropdown(this.activeDropdown);
                    break;
            }
        });
    }

    highlightItem(items, index) {
        items.forEach(item => item.classList.remove('bg-gray-50'));
        if (items[index]) {
            items[index].classList.add('bg-gray-50');
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.autocompleteManager = new DynamicAutocomplete();
});