'use strict';

exports.standardSend = (req, res) =>
    (data = [], success = false, message = 'no message', statusCode=200) => {
        res.status(statusCode).json({
            data: data,
            success: !!success,
            message: message
        });
    };
exports.type = (req, res) => ({
    badRequest: (data = [], message = 'Bad Request') => {
        res.standardSend(data, false, message, 400);
    },
    unAuthorized: (data = [], message = 'Unauthorized') => {
        res.standardSend(data, false, message, 401);
    },
    pageNotFound: (data = [], message = 'Route not found') => {
        res.standardSend(data, false, message, 404);
    },
    notFound: (data = [], message = 'Search not found') => {
        res.standardSend(data, false, message, 206);
    },
    serverError: (data = [], message = 'Server Error') => {
        res.standardSend(data, false, message, 500);
    },
    success: (data = [], message = 'Success!') => {
        res.standardSend(data, true, message, 200);
    },
    notAccepted: (data = [], message = 'Not Accepted') => {
        res.standardSend(data, false, message, 406);
    },
    successButInvalid: (data = [], message = 'Successful call, but client error') => {
        res.standardSend(data, false, message, 202);
    }
});
