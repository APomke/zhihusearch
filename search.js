const express = require('express');
const https = require('https');
const cors = require('cors');
const app = express();

app.use(cors());

const chunks = [];
// 创建一个空的 JSON 对象
const NewJsondata = {
    "data": []
};

function generateArticle(title, excerpt, title_image, url, content, created) {
    return {
        "title": title,
        "excerpt": excerpt,
        "title_image": title_image,
        "url": url,
        "content": content,
        "created": created
    };
}

// 递归函数来获取专栏文章
function getArticles(columnId, limit, offset, callback) {
    const path = `/api/v4/columns/${columnId}/items?limit=${limit}&offset=${offset}`;
    console.log("Request URL: " + path);

    const options = {
        hostname: 'www.zhihu.com',
        path: path,
        method: 'GET',
    };

    const request = https.request(options, (response) => {
        let data = '';

        response.on('data', (chunk) => {
            data += chunk;
        });

        response.on('end', () => {
            chunks.push(data); // 将数据块存储在数组中

            // 判断是否所有数据块都已经获取完毕
            const jsonData = JSON.parse(data);
            const total = jsonData.paging.totals;
            const currentCount = jsonData.data.length;

            console.log("Received " + currentCount + " articles. Total: " + total);

            if (currentCount != 0) {
                // 继续递归调用获取下一批文章
                getArticles(columnId, limit, parseInt(offset) + currentCount, callback);
            } else {
                // 已经获取完所有文章，调用回调函数返回结果
                callback();
            }
        });
    });

    request.on('error', (error) => {
        console.error('Error:', error);
        callback(error);
    });

    request.end();
}

// 获取专栏文章总数
app.get('/api/getTotals', (req, res) => {
    const { columnId, limit, offset } = req.query;
    getArticles(columnId, limit, offset, (error) => {
        if (error) {
            res.status(500).send('Internal Server Error');
        } else {
            // 检查是否已经发送了响应
            if (!res.headersSent) {
                // 数据格式化只返回文章标题，图片，链接，介绍
                for(var i = 0; i < chunks.length; i++){
                    jsonData = JSON.parse(chunks[i]);
                    for(var j = 0; j < jsonData.data.length; j++){
                        var title = jsonData.data[j].title;
                        var excerpt = jsonData.data[j].excerpt;
                        var title_image = jsonData.data[j].title_image;
                        var url = jsonData.data[j].url;
                        var content = jsonData.data[j].content;
                        var created = jsonData.data[j].created;
                        const obj = generateArticle(title,excerpt,title_image,url,content,created);
                        NewJsondata.data.push(obj);
                    }
                }
                res.send(NewJsondata);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
