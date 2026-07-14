package com.feedback.exception;

public class FeedbackAlreadySubmittedException extends RuntimeException {

    public FeedbackAlreadySubmittedException(String message) {
        super(message);
    }
}
