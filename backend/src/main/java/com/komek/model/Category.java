package com.komek.model;

public enum Category {
    PICKUP("Забрать заказ"),
    QUEUE("Постоять в очереди"),
    BUY("Купить товар"),
    DOG_WALK("Выгулять собаку"),
    OTHER("Поручение");

    private final String defaultTitle;

    Category(String defaultTitle) { this.defaultTitle = defaultTitle; }

    /** Used as the task title when the requester leaves the title empty. */
    public String getDefaultTitle() { return defaultTitle; }
}
