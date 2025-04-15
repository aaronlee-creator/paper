const axios = require('axios');
const xml2js = require('xml2js');

let currentPage = 0;
let currentQuery = 'all:LLM OR all:"large language model"';
let currentSortBy = 'submittedDate';
const RESULTS_PER_PAGE = 10;

function buildSearchQuery() {
    const searchInput = document.getElementById('searchInput').value;
    const searchScope = document.getElementById('searchScope').value;
    const authorInput = document.getElementById('authorInput').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    let queryParts = [];
    
    // 添加关键词查询（根据搜索范围）
    if (searchInput) {
        switch(searchScope) {
            case 'ti':
                queryParts.push(`ti:${searchInput}`); // 仅标题
                break;
            case 'abs':
                queryParts.push(`abs:${searchInput}`); // 仅摘要
                break;
            case 'cat':
                queryParts.push(`cat:${searchInput}`); // 仅分类
                break;
            default:
                queryParts.push(`all:${searchInput}`); // 全文搜索
        }
    } else {
        queryParts.push('all:LLM OR all:"large language model"');
    }

    // 添加作者查询（支持多个作者）
    if (authorInput) {
        // 按逗号分割作者名，并去除空格
        const authors = authorInput.split(',').map(author => author.trim());
        if (authors.length > 1) {
            // 多个作者使用 OR 连接
            const authorQuery = authors.map(author => `au:"${author}"`).join(' OR ');
            queryParts.push(`(${authorQuery})`);
        } else {
            // 单个作者直接查询
            queryParts.push(`au:"${authors[0]}"`);
        }
    }

    // 添加日期范围查询
    if (startDate) {
        queryParts.push(`submittedDate:[${startDate} TO *]`);
    }
    if (endDate) {
        queryParts.push(`submittedDate:[* TO ${endDate}]`);
    }

    return queryParts.join(' AND ');
}

function highlightText(text, searchTerms, isAuthor = false) {
    if (!searchTerms || !searchTerms.length) return text;
    
    let highlightedText = text;
    searchTerms.forEach(term => {
        if (!term) return;
        if (isAuthor) {
            // 作者名精确匹配
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            highlightedText = highlightedText.replace(regex, match => `<span class="highlight">${match}</span>`);
        } else {
            // 关键词模糊匹配
            const regex = new RegExp(term, 'gi');
            highlightedText = highlightedText.replace(regex, match => `<span class="highlight">${match}</span>`);
        }
    });
    return highlightedText;
}

async function fetchArxivPapers(page = 0, sortBy = currentSortBy) {
    try {
        const query = buildSearchQuery();
        console.log('Search Query:', query); // 调试用
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
            summary: entry.summary[0],
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
    const searchInput = document.getElementById('searchInput').value;
    const authorInput = document.getElementById('authorInput').value;
    
    // 准备搜索词（模糊匹配）
    const searchTerms = searchInput.trim().split(/\s+/).filter(term => term.length > 0);
    // 准备作者名（按逗号分割）
    const authorTerms = authorInput.split(',').map(author => author.trim()).filter(author => author.length > 0);

    if (papers.length === 0) {
        table.innerHTML = '<tr><td colspan="4">未找到相关论文</td></tr>';
        return;
    }
    
    table.innerHTML = papers.map(paper => {
        const highlightedTitle = highlightText(paper.title, searchTerms);
        const highlightedAuthors = highlightText(paper.authors, authorTerms, true);
        const highlightedSummary = highlightText(paper.summary, searchTerms);

        return `
            <tr>
                <td>
                    <div class="paper-title">
                        <a href="${paper.link}" target="_blank">${highlightedTitle}</a>
                    </div>
                </td>
                <td>${highlightedAuthors}</td>
                <td>${paper.published}</td>
                <td>
                    <div class="paper-summary">${highlightedSummary}</div>
                </td>
            </tr>
        `;
    }).join('');
}

function updatePagination(page) {
    currentPage = page;
    document.getElementById('pageInfo').textContent = `第 ${page + 1} 页`;
    document.getElementById('prevPage').disabled = page === 0;
}

// 事件监听器
document.getElementById('searchButton').addEventListener('click', () => {
    const sortSelect = document.getElementById('sortSelect').value;
    currentSortBy = sortSelect;
    fetchArxivPapers(0, currentSortBy);
});

document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 0) {
        fetchArxivPapers(currentPage - 1, currentSortBy);
    }
});

document.getElementById('nextPage').addEventListener('click', () => {
    fetchArxivPapers(currentPage + 1, currentSortBy);
});

// 日期输入框变化时自动触发搜索
document.getElementById('startDate').addEventListener('change', () => {
    fetchArxivPapers(0, currentSortBy);
});

document.getElementById('endDate').addEventListener('change', () => {
    fetchArxivPapers(0, currentSortBy);
});

// 作者输入框变化时自动触发搜索
document.getElementById('authorInput').addEventListener('input', () => {
    fetchArxivPapers(0, currentSortBy);
});

// 页面加载完成后获取论文数据
document.addEventListener('DOMContentLoaded', () => {
    fetchArxivPapers();
});