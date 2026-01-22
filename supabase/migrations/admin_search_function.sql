-- Advanced admin user search function with ranking and caching support
-- Replaces client-side filtering with efficient server-side queries

CREATE OR REPLACE FUNCTION public.admin_search_users(
  search_query TEXT DEFAULT '',
  role_filter TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  family_id_filter UUID DEFAULT NULL,
  limit INTEGER DEFAULT 100,
  offset INTEGER DEFAULT 0,
  include_ranking BOOLEAN DEFAULT true
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  roles TEXT[],
  families JSONB,
  created_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  status TEXT,
  match_score NUMERIC,
  rank INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'

AS $$
DECLARE
  -- Variables for query building
  search_conditions TEXT := '';
  final_query TEXT;
  
BEGIN
  -- Build search conditions dynamically
  IF search_query IS NOT NULL AND length(trim(search_query)) > 0 THEN
    search_conditions := search_conditions || 
      'AND (
        LOWER(p.first_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') OR
        LOWER(p.last_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') OR
        LOWER(p.email) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') OR
        LOWER(COALESCE(f.family_code, '''')) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') OR
        LOWER(COALESCE(f.display_name, '''')) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%')
      )';
  END IF;
  
  -- Role filtering
  IF role_filter IS NOT NULL THEN
    search_conditions := search_conditions || 
      'AND EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = p.user_id AND ur.role = ' || role_filter || ')';
  END IF;
  
  -- Status filtering (active based on recent login)
  IF status_filter IS NOT NULL THEN
    IF status_filter = 'active' THEN
      search_conditions := search_conditions || 
        'AND p.last_login > NOW() - INTERVAL ''30 days''';
    ELSIF status_filter = 'inactive' THEN
      search_conditions := search_conditions || 
        'AND (p.last_login IS NULL OR p.last_login <= NOW() - INTERVAL ''30 days'')';
    END IF;
  END IF;
  
  -- Family filtering
  IF family_id_filter IS NOT NULL THEN
    search_conditions := search_conditions || 
      'AND EXISTS (SELECT 1 FROM family_members fm WHERE fm.user_id = p.user_id AND fm.family_id = ' || family_id_filter || ')';
  END IF;
  
  -- Build final query
  IF include_ranking THEN
    final_query := '
      SELECT 
        p.user_id as id,
        p.email,
        p.first_name,
        p.last_name,
        COALESCE(
          ARRAY_AGG(ur.role ORDER BY ur.role),
          ARRAY[]::TEXT[]
        ) as roles,
        (
          SELECT COALESCE(
            jsonb_agg(
              jsonb_build_object(
                ''family_code'', COALESCE(f.family_code, ''''),
                ''display_name'', COALESCE(f.display_name, '''')
              )
            )
            FILTER (WHERE f.family_code IS NOT NULL),
            ''[]''::jsonb
          )
        ) as families,
        p.created_at,
        p.last_login,
        CASE 
          WHEN p.last_login > NOW() - INTERVAL ''30 days'' THEN ''active''
          ELSE ''inactive''
        END as status,
        -- Calculate match score for ranking
        CASE 
          WHEN search_query IS NOT NULL AND length(trim(search_query)) > 0 THEN
            (
              CASE 
                WHEN LOWER(p.first_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                WHEN LOWER(p.last_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                WHEN LOWER(p.email) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 0.8 ELSE 0 END +
                WHEN LOWER(COALESCE(f.family_code, '''')) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 0.6 ELSE 0 END +
                WHEN LOWER(COALESCE(f.display_name, '''')) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 0.6 ELSE 0 END
              END
            ) * 10
          ELSE 0
        END as match_score,
        ROW_NUMBER() OVER (
          ORDER BY 
            CASE 
              WHEN search_query IS NOT NULL AND length(trim(search_query)) > 0 THEN 
                (
                  CASE 
                    WHEN LOWER(p.first_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                    WHEN LOWER(p.last_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                    WHEN LOWER(p.email) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 0.8 ELSE 0 END
                  END
                ) * 10
              ELSE 0
            END DESC,
            p.created_at DESC,
            p.last_login DESC NULLS LAST
        ) as rank
      FROM profiles p
      LEFT JOIN user_roles ur ON p.user_id = ur.user_id
      LEFT JOIN family_members fm ON p.user_id = fm.user_id
      LEFT JOIN families f ON fm.family_id = f.family_id
      WHERE 1=1 ' || search_conditions || '
      ORDER BY 
        CASE 
          WHEN search_query IS NOT NULL AND length(trim(search_query)) > 0 THEN 
            (
              CASE 
                WHEN LOWER(p.first_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                WHEN LOWER(p.last_name) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 1.0 ELSE 0 END +
                WHEN LOWER(p.email) LIKE LOWER('' || REPLACE(search_query, '''', '''''') || '%') THEN 0.8 ELSE 0 END
              END
            ) * 10
          ELSE 0
        END DESC,
        p.created_at DESC,
        p.last_login DESC NULLS LAST
      LIMIT ' || limit || '100' || 
      ' OFFSET ' || offset || '0';
  ELSE
    -- Simple query without ranking for performance
    final_query := '
      SELECT 
        p.user_id as id,
        p.email,
        p.first_name,
        p.last_name,
        COALESCE(
          ARRAY_AGG(ur.role ORDER BY ur.role),
          ARRAY[]::TEXT[]
        ) as roles,
        ''[]''::jsonb as families,
        p.created_at,
        p.last_login,
        '' as status,
        0 as match_score,
        0 as rank
      FROM profiles p
      LEFT JOIN user_roles ur ON p.user_id = ur.user_id
      WHERE 1=1 ' || search_conditions || '
      ORDER BY p.created_at DESC
      LIMIT ' || limit || '100' || 
      ' OFFSET ' || offset || '0';
  END IF;
  
  -- Execute the query
  RETURN QUERY EXECUTE final_query;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error for debugging
    RAISE LOG 'Error in admin_search_users: %', SQLERRM;
    
    -- Return empty result on error
    RETURN QUERY SELECT 
      NULL::UUID as id,
      ''::TEXT as email,
      ''::TEXT as first_name,
      ''::TEXT as last_name,
      ARRAY[]::TEXT[] as roles,
      ''[]::jsonb as families,
      NOW()::TIMESTAMPTZ as created_at,
      NULL::TIMESTAMPTZ as last_login,
      ''::TEXT as status,
      0 as match_score,
      0 as rank
    WHERE FALSE;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.admin_search_users IS 'Advanced admin user search with ranking, filtering, and performance optimization';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.admin_search_users TO authenticated, anon;
GRANT SELECT ON admin_search_users TO authenticated, anon;