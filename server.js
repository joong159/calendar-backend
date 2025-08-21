// 필요한 라이브러리를 가져옵니다.
const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.RENDER_EXTERNAL_URL; 

// 이벤트 '읽기' API
app.post('/get-calendar-events', async (req, res) => {
    const { accessToken } = req.body;

    if (!accessToken) {
        return res.status(400).send('Access Token is required');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );
        oauth2Client.setCredentials({ access_token: accessToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        // --- 수정된 부분: 올해 1월 1일부터 12월 31일까지의 이벤트를 가져옵니다. ---
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1); // 올해 시작일
        const endOfYear = new Date(now.getFullYear(), 11, 31); // 올해 마지막일

        const apiResponse = await calendar.events.list({
            calendarId: 'primary',
            timeMin: startOfYear.toISOString(),
            timeMax: endOfYear.toISOString(),
            maxResults: 1000, // 1년치 데이터를 위해 더 많은 이벤트를 가져옵니다
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = apiResponse.data.items;
        if (events && events.length) {
            const formattedEvents = {};
            events.forEach(event => {
                const start = event.start.dateTime || event.start.date;
                const dateKey = start.substring(0, 10);

                if (!formattedEvents[dateKey]) {
                    formattedEvents[dateKey] = [];
                }

                formattedEvents[dateKey].push({
                    title: event.summary,
                    time: event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString('ko-KR') : '하루 종일',
                    description: event.description || '설명 없음',
                    creator: event.creator ? event.creator.email : '알 수 없음'
                });
            });
            res.json(formattedEvents);
        } else {
            res.json({});
        }

    } catch (error) {
        console.error('The API returned an error: ' + error);
        res.status(500).send('Error fetching calendar events');
    }
});

// 이벤트 '생성' API
app.post('/create-event', async (req, res) => {
    const { accessToken, title, date, description, isPrivate } = req.body;

    if (!accessToken || !title || !date) {
        return res.status(400).send('필수 정보(토큰, 제목, 날짜)가 누락되었습니다.');
    }

    try {
        const oauth2Client = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            REDIRECT_URI
        );
        oauth2Client.setCredentials({ access_token: accessToken });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: title,
            description: description,
            start: { date: date, timeZone: 'Asia/Seoul' },
            end: { date: date, timeZone: 'Asia/Seoul' },
        };

        if (isPrivate) {
            event.visibility = 'private';
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        res.status(201).json(response.data);

    } catch (error) {
        console.error('이벤트 생성 중 에러 발생: ' + error);
        res.status(500).send('이벤트 생성에 실패했습니다.');
    }
});


app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
