const axios = require('axios');
const xml2js = require('xml2js');

async function fetchArxivPapers() {
    try {
        const response = await axios.get('http://export.arxiv.org/api/query', {
            params: {
                search_query: 'all:LLM OR all:"large language model"',
                start: 0,
                max_results: 10,
                sortBy: 'submittedDate',
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
    } catch (error) {
        console.error('Error fetching papers:', error);
        document.getElementById('papersTable').innerHTML = '<tr><td colspan="4">获取论文数据时出错</td></tr>';
    }
}

function displayPapers(papers) {
    const table = document.getElementById('papersTable');
    table.innerHTML = papers.map(paper => `
        <tr>
            <td><a href="${paper.link}" target="_blank">${paper.title}</a></td>
            <td>${paper.authors}</td>
            <td>${paper.published}</td>
            <td>${paper.summary}</td>
        </tr>
    `).join('');
}

// 页面加载完成后获取论文数据
document.addEventListener('DOMContentLoaded', fetchArxivPapers); 