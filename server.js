const { server } = require('./socket');
const port = 3001;

// 환경파일 내 PORT 정보가 존재하지 않는다면, 로컬환경인 것으로 간주하며, 3000번 포트로 서버를 열어준다.
server.listen(port, () => {
    console.log(process.env.PORT);
    console.log(port, '번으로 서버가 연결되었습니다.');
    console.log(`http://localhost:${port}`);
});
