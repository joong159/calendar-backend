// 필요한 라이브러리를 가져옵니다.
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

// Express 앱을 생성합니다.
const app = express();
const port = 3000; // 서버가 실행될 포트

// CORS 미들웨어를 사용하여 다른 도메인에서의 요청을 허용합니다.
// (프론트엔드와 백엔드가 다른 포트에서 실행되므로 필요합니다.)
app.use(cors());
// 요청 본문(body)을 JSON 형태로 파싱하기 위한 미들웨어입니다.
app.use(express.json());

/**
 * '/get-calendar-events' 경로로 POST 요청이 오면 실행될 API 엔드포인트입니다.
 * 이 엔드포인트는 프론트엔드로부터 accessToken을 받아 구글 캘린더 이벤트를 가져옵니다.
 */
app.post('/get-calendar-events', async (req, res) => {
    // 요청 본문에서 accessToken을 추출합니다.
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).send('Access Token is required');
    }

    try {
        // Google OAuth2 클라이언트를 설정합니다.
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: accessToken });

        // OAuth2 클라이언트를 사용하여 Google Calendar API 인스턴스를 생성합니다.
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // 현재 시간과 한 달 뒤의 시간을 계산합니다.
        const now = new Date();
        const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        // Google Calendar API를 호출하여 'primary' 캘린더의 이벤트 목록을 가져옵니다.
        const apiResponse = await calendar.events.list({
            calendarId: 'primary', // 'primary'는 사용자의 기본 캘린더를 의미합니다.
            timeMin: now.toISOString(), // 검색 시작 시간
            timeMax: oneMonthLater.toISOString(), // 검색 종료 시간
            maxResults: 15, // 최대 15개의 이벤트를 가져옵니다.
            singleEvents: true, // 반복 이벤트를 개별 이벤트로 확장합니다.
            orderBy: 'startTime', // 시작 시간 순으로 정렬합니다.
        });

        const events = apiResponse.data.items;
        if (events.length) {
            // 프론트엔드가 사용하기 좋은 형태로 데이터를 가공합니다.
            const formattedEvents = {};
            events.forEach(event => {
                const start = event.start.dateTime || event.start.date; // 종일 일정이면 date, 아니면 dateTime
                const dateKey = start.substring(0, 10); // 'YYYY-MM-DD' 형식의 키

                if (!formattedEvents[dateKey]) {
                    formattedEvents[dateKey] = [];
                }

                formattedEvents[dateKey].push({
                    title: event.summary,
                    time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('ko-KR') : '하루 종일',
                    description: event.description || '설명 없음'
                });
            });
            res.json(formattedEvents);
        } else {
            res.json({}); // 이벤트가 없으면 빈 객체를 보냅니다.
        }

    } catch (error) {
        console.error('The API returned an error: ' + error);
        res.status(500).send('Error fetching calendar events');
    }
});

// 지정된 포트에서 서버를 실행합니다.
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
