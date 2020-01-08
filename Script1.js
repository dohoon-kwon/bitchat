// JavaScript source code
'use strict';

const winston = require('winston');

class Logger {

    create() {
        // logger ���� ����
        const logger = winston.createLogger({
            level: 'info', // log level
            format: winston.format.json(),
            transports: [
                //
                // - Write to all logs with level `info` and below to `combined.log`
                // - Write all logs error (and below) to `error.log`.
                // �������� Ȯ���غ��� �� ���� ������ �� ���ִ�.

                // ���� ���� �α� ���� (error log ��ġ)
                new winston.transports.File({ filename: 'error.log', level: 'error', prettyPrint: true }),
                // ���� ���� �α� ���� (info log ����)
                new winston.transports.File({ filename: 'info.log', prettyPrint: true })
            ],
            colorize: true,
            humanReadableUnhandledException: true
        });

        // ������� ���� ��� �ֿܼ� ��� �߰�
        if (process.env.NODE_ENV !== 'production') {
            logger.add(new winston.transports.Console({
                format: winston.format.simple()
            }));
        }

        return logger;
    }
};

module.exports = new Logger();