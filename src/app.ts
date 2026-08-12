import express, { NextFunction, Response } from 'express';
import cors from 'cors';
import * as leetcode from './leetCode';
import { FetchUserDataRequest } from './types';
import axios from 'axios';
import {
  userContestRankingInfoQuery,
  discussCommentsQuery,
  discussTopicQuery,
  userProfileUserQuestionProgressV2Query,
  skillStatsQuery,
  getUserProfileQuery,
  userProfileCalendarQuery,
  officialSolutionQuery,
  dailyQeustion,
} from './GQLQueries/newQueries';

const app = express();
const API_URL = process.env.LEETCODE_API_URL || 'https://leetcode.com/graphql';

const corsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:2406',
      'http://localhost:5173',
      'http://localhost:5174',
      'https://glzql09s-3000.inc1.devtunnels.ms',
    ];

    const isDevTunnel = /^https:\/\/[a-z0-9-]+\.inc1\.devtunnels\.ms$/i.test(origin);
    if (allowedOrigins.includes(origin) || isDevTunnel) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  methods: ['GET', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use((req: express.Request, _res: Response, next: NextFunction) => {
  console.log('Requested URL:', req.originalUrl);
  next();
});

async function queryLeetCodeAPI(query: string, variables: any) {
  try {
    const response = await axios.post(API_URL, { query, variables });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`Error from LeetCode API: ${error.response.data}`);
    } else if (error.request) {
      throw new Error('No response received from LeetCode API');
    } else {
      throw new Error(`Error in setting up the request: ${error.message}`);
    }
  }
}

app.get('/', (_req, res) => {
  res.json({
    apiOverview:
      'Welcome to the Alfa-Leetcode-API! Alfa-Leetcode-Api is a custom solution born out of the need for a well-documented and detailed LeetCode API. This project is designed to provide developers with endpoints that offer insights into a user"s profile, badges, solved questions, contest details, contest history, submissions, and also daily questions, selected problem, list of problems.',
    apiEndpointsLink:
      'https://github.com/alfaarghya/alfa-leetcode-api?tab=readme-ov-file#endpoints-',
    routes: {
      userDetails: {
        description:
          'Endpoints for retrieving detailed user profile information on Leetcode.',
        Method: 'GET',
        '/:username': 'Get your leetcodevis profile Details',
        '/:username/badges': 'Get your badges',
        '/:username/solved': 'Get total number of question you solved',
        '/:username/contest': 'Get your contest details',
        '/:username/contest/history': 'Get all contest history',
        '/:username/submission': 'Get your last 20 submission',
        '/:username/acSubmission': 'Get your last 20 accepted submission',
        '/:username/calendar': 'Get your submission calendar',
        '/userProfile/:username': 'Get full profile details in one call',
        '/userProfileCalendar?username=yourname&year=2024':
          'Get your calendar details with year',
        '/languageStats?username=yourname': 'Get the language stats of a user',
        '/userProfileUserQuestionProgressV2/:userSlug':
          'Get your question progress',
        '/skillStats/:username': 'Get your skill stats',
      },
      contest: {
        description:
          'Endpoints for retrieving contest ranking and performance data.',
        Method: 'GET',
        '/userContestRankingInfo/:username': 'Get user contest ranking info',
      },
      discussion: {
        description: 'Endpoints for fetching discussion topics and comments.',
        Method: 'GET',
        '/trendingDiscuss?first=20': 'Get top 20 trending discussions',
        '/discussTopic/:topicId': 'Get discussion topic',
        '/discussComments/:topicId': 'Get discussion comments',
      },
      problems: {
        description:
          'Endpoints for fetching problem-related data, including lists, details, and solutions.',
        Method: 'GET',
        singleProblem: {
          '/select?titleSlug=two-sum': 'Get selected Problem',
          '/daily': 'Get daily Problem',
          '/dailyQuestion': 'Get raw daily question',
        },
        problemList: {
          '/problems': 'Get list of 20 problems',
          '/problems?limit=50': 'Get list of some problems',
          '/problems?tags=array+math': 'Get list problems on selected topics',
          '/problems?tags=array+math+string&limit=5':
            'Get list some problems on selected topics',
          '/officialSolution?titleSlug=two-sum':
            'Get official solution of selected problem',
        },
      },
    },
  });
});

app.get('/officialSolution', async (req, res) => {
  const { titleSlug } = req.query;

  if (!titleSlug) {
    return res.status(400).json({ error: 'Missing titleSlug query parameter' });
  }
  try {
    const data = await queryLeetCodeAPI(officialSolutionQuery, { titleSlug });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/userProfileCalendar', async (req, res) => {
  const { username, year } = req.query;

  if (!username || !year || typeof year !== 'string') {
    return res
      .status(400)
      .json({ error: 'Missing or invalid username or year query parameter' });
  }

  try {
    const data = await queryLeetCodeAPI(userProfileCalendarQuery, {
      username,
      year: parseInt(year),
    });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Format data
const formatData = (data: any) => {
  return {
    totalSolved: data.matchedUser.submitStats.acSubmissionNum[0].count,
    totalSubmissions: data.matchedUser.submitStats.totalSubmissionNum,
    totalQuestions: data.allQuestionsCount[0].count,
    easySolved: data.matchedUser.submitStats.acSubmissionNum[1].count,
    totalEasy: data.allQuestionsCount[1].count,
    mediumSolved: data.matchedUser.submitStats.acSubmissionNum[2].count,
    totalMedium: data.allQuestionsCount[2].count,
    hardSolved: data.matchedUser.submitStats.acSubmissionNum[3].count,
    totalHard: data.allQuestionsCount[3].count,
    ranking: data.matchedUser.profile.ranking,
    contributionPoint: data.matchedUser.contributions.points,
    reputation: data.matchedUser.profile.reputation,
    submissionCalendar: JSON.parse(data.matchedUser.submissionCalendar),
    recentSubmissions: data.recentSubmissionList,
    matchedUserStats: data.matchedUser.submitStats,
  };
};

app.get('/userProfile/:id', async (req, res) => {
  const user = req.params.id;

  try {
    const data = await queryLeetCodeAPI(getUserProfileQuery, {
      username: user,
    });
    if (data.errors) {
      res.send(data);
    } else {
      res.send(formatData(data.data));
    }
  } catch (error) {
    res.send(error);
  }
});

const handleRequest = async (res: Response, query: string, params: any) => {
  try {
    const data = await queryLeetCodeAPI(query, params);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
app.get('/dailyQuestion', (_, res) => {
  handleRequest(res, dailyQeustion, {});
});

app.get('/skillStats/:username', (req, res) => {
  const { username } = req.params;
  handleRequest(res, skillStatsQuery, { username });
});

app.get('/userProfileUserQuestionProgressV2/:userSlug', (req, res) => {
  const { userSlug } = req.params;
  handleRequest(res, userProfileUserQuestionProgressV2Query, { userSlug });
});

app.get('/discussTopic/:topicId', (req, res) => {
  const topicId = parseInt(req.params.topicId);
  handleRequest(res, discussTopicQuery, { topicId });
});

app.get('/discussComments/:topicId', (req, res) => {
  const topicId = parseInt(req.params.topicId);
  const {
    orderBy = 'newest_to_oldest',
    pageNo = 1,
    numPerPage = 10,
  } = req.query;
  handleRequest(res, discussCommentsQuery, {
    topicId,
    orderBy,
    pageNo,
    numPerPage,
  });
});

app.get('/userContestRankingInfo/:username', (req, res) => {
  const { username } = req.params;
  handleRequest(res, userContestRankingInfoQuery, { username });
});

//get the daily leetCode problem
app.get('/daily', leetcode.dailyProblem);

//get the selected question
app.get('/select', leetcode.selectProblem);

//get list of problems
app.get('/problems', leetcode.problems);

//get 20 trending Discuss
app.get('/trendingDiscuss', leetcode.trendingCategoryTopics);

app.get('/languageStats', leetcode.languageStats);

const getCalendarSubmissionsForRange = async (
  username: string,
  start: Date,
  end: Date
) => {
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const years = Array.from(
    { length: endYear - startYear + 1 },
    (_, index) => startYear + index
  );
  const days: { date: string; timestamp: number; count: number }[] = [];

  for (const year of years) {
    const data = await queryLeetCodeAPI(userProfileCalendarQuery, {
      username,
      year,
    });
    const calendarRaw =
      data?.data?.matchedUser?.userCalendar?.submissionCalendar || '{}';
    const calendar =
      typeof calendarRaw === 'string' ? JSON.parse(calendarRaw) : calendarRaw;

    Object.entries(calendar || {}).forEach(([timestampKey, countValue]) => {
      const timestamp = Number(timestampKey);
      const submittedAt = new Date(timestamp * 1000);

      if (submittedAt >= start && submittedAt <= end) {
        days.push({
          date: submittedAt.toISOString().slice(0, 10),
          timestamp,
          count: Number(countValue) || 0,
        });
      }
    });
  }

  days.sort((a, b) => a.timestamp - b.timestamp);

  return {
    count: days.reduce((total, day) => total + day.count, 0),
    days,
  };
};

app.get('/:username/submissionHistory', async (req, res) => {
  const { username } = req.params;
  const start = req.query.start ? new Date(String(req.query.start)) : null;
  const end = req.query.end ? new Date(String(req.query.end)) : null;
  const session = process.env.LEETCODE_SESSION;
  const csrf = process.env.LEETCODE_CSRF_TOKEN;

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return res.status(400).json({ error: 'Valid start and end query parameters are required' });
  }

  try {
    if (!session) {
      const calendar = await getCalendarSubmissionsForRange(username, start, end);

      return res.json({
        count: calendar.count,
        submission: [],
        calendarOnly: true,
        calendarDays: calendar.days,
        message:
          'LeetCode public data only includes date-wise submission counts for historical ranges.',
      });
    }

    const submissions = [];
    let offset = 0;
    const limit = 20;
    let hasNext = true;

    while (hasNext && offset < 1000) {
      const response = await fetch(
        `https://leetcode.com/api/submissions/${encodeURIComponent(username)}/?offset=${offset}&limit=${limit}`,
        {
          headers: {
            Referer: `https://leetcode.com/u/${username}/`,
            Cookie: [
              `LEETCODE_SESSION=${session}`,
              csrf ? `csrftoken=${csrf}` : null,
            ].filter(Boolean).join('; '),
            ...(csrf ? { 'X-CSRFToken': csrf } : {}),
          },
        }
      );

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Failed to fetch LeetCode submission history: ${response.statusText}`,
        });
      }

      const data = await response.json();
      const pageSubmissions = data.submissions_dump || data.submissions || [];
      hasNext = Boolean(data.has_next);

      for (const item of pageSubmissions) {
        const timestamp = Number(item.timestamp || item.time);
        const submittedAt = new Date(timestamp * 1000);
        if (submittedAt >= start && submittedAt <= end) {
          submissions.push({
            id: item.id,
            title: item.title,
            titleSlug: item.title_slug || item.titleSlug,
            timestamp: String(timestamp),
            statusDisplay: item.status_display || item.statusDisplay,
            lang: item.lang,
          });
        }
      }

      const oldestTimestamp = pageSubmissions
        .map((item: any) => Number(item.timestamp || item.time))
        .filter(Boolean)
        .sort((a: number, b: number) => a - b)[0];

      if (oldestTimestamp && new Date(oldestTimestamp * 1000) < start) {
        hasNext = false;
      }

      offset += limit;
    }

    return res.json({ count: submissions.length, submission: submissions });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Construct options object on all user routes.
app.use(
  '/:username*',
  (req: FetchUserDataRequest, _res: Response, next: NextFunction) => {
    req.body = {
      username: req.params.username,
      limit: req.query.limit,
    };
    next();
  }
);

//get user profile details
app.get('/:username', leetcode.userData);
app.get('/:username/badges', leetcode.userBadges);
app.get('/:username/solved', leetcode.solvedProblem);
app.get('/:username/contest', leetcode.userContest);
app.get('/:username/contest/history', leetcode.userContestHistory);
app.get('/:username/submission', leetcode.submission);
app.get('/:username/acSubmission', leetcode.acSubmission);
app.get('/:username/calendar', leetcode.calendar);

export default app;
