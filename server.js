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

// 기존의 이벤트 '읽기' API
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

        const now = new Date();
        const oneMonthLater = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

        const apiResponse = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: oneMonthLater.toISOString(),
            maxResults: 15,
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
                    description: event.description || '설명 없음'
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

// --- 수정된 이벤트 '생성' API ---
app.post('/create-event', async (req, res) => {
    // isPrivate 값을 요청 본문에서 받아옵니다.
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

        // 구글 캘린더 API에 맞는 이벤트 객체 형식으로 만듭니다.
        const event = {
            summary: title,
            description: description,
            start: {
                date: date, // 'YYYY-MM-DD' 형식
                timeZone: 'Asia/Seoul',
            },
            end: {
                date: date, // 종일 일정으로 설정
                timeZone: 'Asia/Seoul',
            },
        };

        // '나만 보기' 옵션이 true인 경우, 이벤트 공개 상태를 'private'으로 설정합니다.
        if (isPrivate) {
            event.visibility = 'private';
        }

        // 'primary' 캘린더에 새 이벤트를 삽입(insert)합니다.
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
