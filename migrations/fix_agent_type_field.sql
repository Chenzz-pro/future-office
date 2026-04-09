-- 修复Agent类型字段，使其与AgentFactory和LLM输出一致
-- 将 approval 改为 approval-agent，meeting 改为 meeting-agent，等等

UPDATE agents SET type = 'approval-agent' WHERE type = 'approval';
UPDATE agents SET type = 'meeting-agent' WHERE type = 'meeting';
UPDATE agents SET type = 'data-agent' WHERE type = 'data';
UPDATE agents SET type = 'assistant-agent' WHERE type = 'assistant';

-- 更新agents_skills表中的agent_type
UPDATE agents_skills SET agent_type = 'approval-agent' WHERE agent_type = 'approval';
UPDATE agents_skills SET agent_type = 'meeting-agent' WHERE agent_type = 'meeting';
UPDATE agents_skills SET agent_type = 'data-agent' WHERE agent_type = 'data';
UPDATE agents_skills SET agent_type = 'assistant-agent' WHERE agent_type = 'assistant';

-- 更新agents_bots表中的agent_type（如果有数据）
UPDATE agents_bots SET agent_type = 'approval-agent' WHERE agent_type = 'approval';
UPDATE agents_bots SET agent_type = 'meeting-agent' WHERE agent_type = 'meeting';
UPDATE agents_bots SET agent_type = 'data-agent' WHERE agent_type = 'data';
UPDATE agents_bots SET agent_type = 'assistant-agent' WHERE agent_type = 'assistant';
