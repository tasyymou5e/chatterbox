-- Insert sample performance metrics data for testing
INSERT INTO performance_metrics (
  metric_type, 
  value, 
  threshold_exceeded,
  component_name,
  route_path,
  user_id,
  metadata
) VALUES 
-- Component render time metrics
('component_render_time', 45.2, false, 'AdminDashboard', '/admin/dashboard', NULL, '{"timerName": "dashboard_render", "threshold": 100}'),
('component_render_time', 120.8, true, 'SystemHealthLogs', '/admin/system-monitoring', NULL, '{"timerName": "health_logs_render", "threshold": 100}'),
('component_render_time', 23.1, false, 'ParentDashboard', '/parent-dashboard', NULL, '{"timerName": "parent_render", "threshold": 100}'),

-- Page load time metrics
('page_load_time', 1250.5, false, NULL, '/admin/dashboard', NULL, '{"domContentLoaded": 890.2, "firstContentfulPaint": 1100.3}'),
('page_load_time', 3250.8, true, NULL, '/admin/system-monitoring', NULL, '{"domContentLoaded": 2100.5, "firstContentfulPaint": 2800.1}'),
('page_load_time', 890.2, false, NULL, '/parent-dashboard', NULL, '{"domContentLoaded": 650.3, "firstContentfulPaint": 750.8}'),

-- API response time metrics
('api_response_time', 150.3, false, NULL, NULL, NULL, '{"url": "/rest/v1/families", "status": 200, "slow": false}'),
('api_response_time', 2800.7, true, NULL, NULL, NULL, '{"url": "/rest/v1/performance_metrics", "status": 200, "slow": true}'),
('api_response_time', 95.1, false, NULL, NULL, NULL, '{"url": "/rest/v1/user_activity_logs", "status": 200, "slow": false}'),

-- Memory usage metrics  
('memory_usage', 45678912, false, NULL, NULL, NULL, '{"totalJSHeapSize": 67108864, "jsHeapSizeLimit": 134217728, "usagePercentage": 34.0}'),
('memory_usage', 118562304, true, NULL, NULL, NULL, '{"totalJSHeapSize": 134217728, "jsHeapSizeLimit": 134217728, "usagePercentage": 88.3}'),
('memory_usage', 23654784, false, NULL, NULL, NULL, '{"totalJSHeapSize": 33554432, "jsHeapSizeLimit": 134217728, "usagePercentage": 17.6}');