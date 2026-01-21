import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';
import { getCorsHeaders } from '../_shared/cors.ts';
import { generalApiLimiter, RateLimiter } from '../_shared/rate-limiter.ts';

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'custom';
  interval?: number;
  daysOfWeek?: number[];
  endDate?: string;
  maxOccurrences?: number;
  currentOccurrence?: number;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = generalApiLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for process-recurring-chores');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting recurring chores processing...');

    // Find assignments that are completed/verified with recurring pattern
    const { data: recurringAssignments, error: fetchError } = await supabase
      .from('chore_assignments')
      .select(`
        id,
        chore_id,
        family_id,
        assigned_to,
        assigned_by,
        due_date,
        status,
        recurrence_pattern
      `)
      .not('recurrence_pattern', 'is', null)
      .in('status', ['completed', 'verified'])
      .lte('due_date', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching recurring assignments:', fetchError);
      throw fetchError;
    }

    console.log(`Found ${recurringAssignments?.length || 0} assignments to process`);

    const results = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const assignment of recurringAssignments || []) {
      try {
        const pattern = assignment.recurrence_pattern as RecurrencePattern;
        
        if (!pattern || !pattern.frequency) {
          results.skipped++;
          continue;
        }

        // Check if we've already created a new assignment for this pattern
        const { data: existingNext } = await supabase
          .from('chore_assignments')
          .select('id')
          .eq('chore_id', assignment.chore_id)
          .eq('assigned_to', assignment.assigned_to)
          .eq('status', 'assigned')
          .gt('due_date', assignment.due_date)
          .limit(1);

        if (existingNext && existingNext.length > 0) {
          console.log(`Skipping ${assignment.id} - next assignment already exists`);
          results.skipped++;
          continue;
        }

        // Calculate next due date using database function
        const { data: nextDueDateResult, error: calcError } = await supabase
          .rpc('calculate_next_due_date', {
            pattern: pattern,
            current_due_date: assignment.due_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          });

        if (calcError) {
          console.error(`Error calculating next date for ${assignment.id}:`, calcError);
          results.errors.push(`${assignment.id}: ${calcError.message}`);
          continue;
        }

        if (!nextDueDateResult) {
          console.log(`No next date for ${assignment.id} - series complete`);
          results.skipped++;
          continue;
        }

        // Update occurrence count in pattern
        const updatedPattern: RecurrencePattern = {
          ...pattern,
          currentOccurrence: (pattern.currentOccurrence || 0) + 1,
        };

        // Create new assignment
        const { data: newAssignment, error: insertError } = await supabase
          .from('chore_assignments')
          .insert({
            chore_id: assignment.chore_id,
            family_id: assignment.family_id,
            assigned_to: assignment.assigned_to,
            assigned_by: assignment.assigned_by,
            due_date: nextDueDateResult,
            status: 'assigned',
            recurrence_pattern: updatedPattern,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`Error creating assignment for ${assignment.id}:`, insertError);
          results.errors.push(`${assignment.id}: ${insertError.message}`);
          continue;
        }

        console.log(`Created new assignment ${newAssignment.id} due ${nextDueDateResult}`);
        results.created++;
        results.processed++;
      } catch (error) {
        console.error(`Error processing ${assignment.id}:`, error);
        results.errors.push(`${assignment.id}: ${error.message}`);
      }
    }

    console.log('Processing complete:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.processed} recurring assignments, created ${results.created} new assignments`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in process-recurring-chores:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
