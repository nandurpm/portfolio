/* ============================================
   WRITINGS PAGE JAVASCRIPT
   ============================================ */

// Filter writings by category
const filterButtons = document.querySelectorAll('.filter-btn');
const writingItems = document.querySelectorAll('.writing-item');

if (filterButtons.length > 0) {
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons
      filterButtons.forEach(btn => btn.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Get the category from the button
      const category = button.getAttribute('data-category');
      
      // Filter items
      writingItems.forEach(item => {
        if (category === 'all' || item.getAttribute('data-category') === category) {
          item.style.display = 'block';
          item.classList.add('reveal', 'active');
          item.style.animation = 'fadeIn 0.5s ease';
        } else {
          item.style.display = 'none';
          item.classList.remove('active');
        }
      });
    });
  });
}

// Search functionality for writings
const searchInput = document.querySelector('.search-input');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    
    writingItems.forEach(item => {
      const title = item.querySelector('h3').textContent.toLowerCase();
      const description = item.querySelector('p').textContent.toLowerCase();
      
      if (title.includes(searchTerm) || description.includes(searchTerm)) {
        item.style.display = 'block';
        item.style.animation = 'fadeIn 0.3s ease';
      } else {
        item.style.display = 'none';
      }
    });
  });
}

// Sort writings by date (newest first)
const sortButton = document.querySelector('.sort-btn');
if (sortButton) {
  sortButton.addEventListener('click', () => {
    const container = document.querySelector('.writings-grid');
    const items = Array.from(container.querySelectorAll('.writing-item'));
    
    items.sort((a, b) => {
      const dateA = new Date(a.getAttribute('data-date'));
      const dateB = new Date(b.getAttribute('data-date'));
      return dateB - dateA;
    });
    
    items.forEach(item => container.appendChild(item));
  });
}

// Read more functionality
const readMoreButtons = document.querySelectorAll('.read-more-btn');
readMoreButtons.forEach(button => {
  button.addEventListener('click', (e) => {
    e.preventDefault();
    const url = button.getAttribute('href');
    window.location.href = url;
  });
});

// Highlight search results
const highlightSearchResults = (searchTerm) => {
  if (!searchTerm) return;
  
  writingItems.forEach(item => {
    const text = item.textContent;
    const regex = new RegExp(searchTerm, 'gi');
    
    if (regex.test(text)) {
      item.style.borderColor = 'var(--primary-color)';
      item.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)';
    }
  });
};

// Category statistics
const updateCategoryStats = () => {
  const categories = {};
  
  writingItems.forEach(item => {
    const category = item.getAttribute('data-category');
    categories[category] = (categories[category] || 0) + 1;
  });
  
  console.log('Writing Categories:', categories);
};

window.addEventListener('load', updateCategoryStats);

// Reading time estimation
const calculateReadingTime = (text) => {
  const wordsPerMinute = 200;
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return minutes;
};

// Display reading time
const readingTimeElements = document.querySelectorAll('.reading-time');
readingTimeElements.forEach(element => {
  const article = element.closest('.writing-item');
  if (article) {
    const text = article.textContent;
    const time = calculateReadingTime(text);
    element.textContent = `${time} min read`;
  }
});

// Tag filtering
const tagButtons = document.querySelectorAll('.tag-btn');
tagButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tag = button.getAttribute('data-tag');
    
    writingItems.forEach(item => {
      const itemTags = item.getAttribute('data-tags').split(',').map(t => t.trim());
      
      if (itemTags.includes(tag)) {
        item.style.display = 'block';
        item.style.animation = 'fadeIn 0.3s ease';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

// Pagination for writings
const itemsPerPage = 6;
let currentPage = 1;

const paginateWritings = () => {
  const totalPages = Math.ceil(writingItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  writingItems.forEach((item, index) => {
    if (index >= startIndex && index < endIndex) {
      item.style.display = 'block';
      item.style.animation = 'fadeIn 0.3s ease';
    } else {
      item.style.display = 'none';
    }
  });
  
  updatePaginationButtons(totalPages);
};

const updatePaginationButtons = (totalPages) => {
  const prevBtn = document.querySelector('.pagination-prev');
  const nextBtn = document.querySelector('.pagination-next');
  const pageInfo = document.querySelector('.page-info');
  
  if (prevBtn) {
    prevBtn.disabled = currentPage === 1;
  }
  
  if (nextBtn) {
    nextBtn.disabled = currentPage === totalPages;
  }
  
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
};

const prevPaginationBtn = document.querySelector('.pagination-prev');
const nextPaginationBtn = document.querySelector('.pagination-next');

if (prevPaginationBtn) {
  prevPaginationBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      paginateWritings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

if (nextPaginationBtn) {
  nextPaginationBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(writingItems.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      paginateWritings();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
}

// Initialize pagination on load
window.addEventListener('load', () => {
  if (writingItems.length > itemsPerPage) {
    paginateWritings();
  }
});

// Export writings data
const exportWritingsData = () => {
  const data = Array.from(writingItems).map(item => ({
    title: item.querySelector('h3').textContent,
    category: item.getAttribute('data-category'),
    date: item.getAttribute('data-date'),
    description: item.querySelector('p').textContent
  }));
  
  console.log(JSON.stringify(data, null, 2));
  return data;
};

// Make export function available globally
window.exportWritingsData = exportWritingsData;
