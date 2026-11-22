package com.komek.model;

import jakarta.persistence.*;

/** Profile photo, kept in its own table so that loading a user never loads image bytes. */
@Entity
@Table(name = "avatars")
public class Avatar {

    @Id
    @Column(name = "user_id")
    private Long userId;

    /** Random, unguessable part of the public URL. Changes with every new photo (so browsers re-download it). */
    @Column(name = "photo_key", nullable = false, unique = true, length = 40)
    private String photoKey;

    @Column(name = "content_type", nullable = false, length = 30)
    private String contentType;

    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    public Long getUserId() { return userId; }
    public void setUserId(Long v) { this.userId = v; }
    public String getPhotoKey() { return photoKey; }
    public void setPhotoKey(String v) { this.photoKey = v; }
    public String getContentType() { return contentType; }
    public void setContentType(String v) { this.contentType = v; }
    public byte[] getData() { return data; }
    public void setData(byte[] v) { this.data = v; }
}
