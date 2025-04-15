function updateTime() {
    const timeElement = document.getElementById('time');
    timeElement.textContent = new Date().toLocaleTimeString();
}

// 每秒更新一次时间
setInterval(updateTime, 1000);
updateTime(); 