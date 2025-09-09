-- Drop existing restrictive policies for guest access
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.content_categories;
DROP POLICY IF EXISTS "Family members can view accessible content" ON public.content_items;

-- Create new guest-friendly policy for categories
CREATE POLICY "Everyone can view active categories" 
ON public.content_categories
FOR SELECT 
USING (is_active = true);

-- Create new guest-friendly policy for content items
CREATE POLICY "Public can view approved content" 
ON public.content_items
FOR SELECT 
USING (
    is_active = true 
    AND approval_status = 'approved'
    AND (
        -- Guest access: can see non-family-restricted content
        auth.uid() IS NULL
        OR (
            -- Authenticated access: existing family logic preserved
            auth.uid() IS NOT NULL 
            AND (
                -- Content not restricted to specific families
                NOT EXISTS (
                    SELECT 1 FROM public.family_content_access 
                    WHERE content_item_id = content_items.id
                )
                OR 
                -- User has family access to restricted content
                EXISTS (
                    SELECT 1 FROM public.family_content_access fca
                    JOIN public.family_members fm ON fm.family_id = fca.family_id
                    WHERE fca.content_item_id = content_items.id 
                    AND fm.user_id = auth.uid() 
                    AND fca.access_type IN ('allowed', 'featured')
                )
                OR
                -- Admin users have full access
                has_role(auth.uid(), 'admin'::app_role)
            )
        )
    )
);