const axios = require('axios');
const xml2js = require('xml2js');

let currentPage = 0;
let currentQuery = 'all:LLM OR all:"large language model"';
let currentSortBy = 'submittedDate';
const RESULTS_PER_PAGE = 10;

async function fetchArxivPapers(page = 0, query = currentQuery, sortBy = currentSortBy) {
    try {
        const response = await axios.get('http://export.arxiv.org/api/query', {
            params: {
                search_query: query,
                start: page * RESULTS_PER_PAGE,
                max_results: RESULTS_PER_PAGE,
                sortBy: sortBy,
                sortOrder: 'descending'
            }
        });

        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        const entries = result.feed.entry || [];
        const papers = entries.map(entry => ({
            title: entry.title[0],
            authors: entry.author.map(author => author.name[0]).join(', '),
            published: new Date(entry.published[0]).toLocaleDateString(),
            summary: entry.summary[0].substring(0, 200) + '...',
            link: entry.link[0].$.href
        }));

        displayPapers(papers);
        updatePagination(page);
    } catch (error) {
        console.error('Error fetching papers:', error);
        document.getElementById('papersTable').innerHTML = '<tr><td colspan="4">获取论文数据时出错</td></tr>';
    }
}

function displayPapers(papers) {
    const table = document.getElementById('papersTable');
    if (papers.length === 0) {
        table.innerHTML = '<tr><td colspan="4">未找到相关论文</td></tr>';
        return;
    }
    
    table.innerHTML = papers.map(paper => `
        <tr>
            <td><a href="${paper.link}" target="_blank">${paper.title}</a></td>
            <td>${paper.authors}</td>
            <td>${paper.published}</td>
            <td>${paper.summary}</td>
        </tr>
    `).join('');
}

function updatePagination(page) {
    currentPage = page;
    document.getElementById('pageInfo').textContent = `第 ${page + 1} 页`;
    document.getElementById('prevPage').disabled = page === 0;
}

// 事件监听器
document.getElementById('searchButton').addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput').value;
    const sortSelect = document.getElementById('sortSelect').value;
    currentQuery = searchInput ? `all:${searchInput}` : 'all:LLM OR all:"large language model"';
    currentSortBy = sortSelect;
    fetchArxivPapers(0, currentQuery, currentSortBy);
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 0) {
        fetchArxivPapers(currentPage - 1, currentQuery, currentSortBy);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    fetchArxivPapers(currentPage + 1, currentQuery, currentSortBy);
});

// 页面加载完成后获取论文数据
document.addEventListener('DOMContentLoaded', () => {
    fetchArxivPapers();
}); 