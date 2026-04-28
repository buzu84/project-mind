-- Add chunk_index to document_chunks for ordering within a document
alter table document_chunks add column chunk_index int default 0 not null;

