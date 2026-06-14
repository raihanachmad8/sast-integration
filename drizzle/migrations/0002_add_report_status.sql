-- Migration: Add status column to reports table
-- Generated: 2026-06-11

ALTER TABLE "reports" ADD COLUMN "status" varchar(20) NOT NULL DEFAULT 'generated';
