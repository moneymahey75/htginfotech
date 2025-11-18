// Test Worker to diagnose R2 binding issue

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Debug: Check what we have
      const debug = {
        hasCOURSE_VIDEOS: !!env.COURSE_VIDEOS,
        type: typeof env.COURSE_VIDEOS,
        isObject: env.COURSE_VIDEOS instanceof Object,
        constructor: env.COURSE_VIDEOS?.constructor?.name,
        methods: env.COURSE_VIDEOS ? Object.getOwnPropertyNames(Object.getPrototypeOf(env.COURSE_VIDEOS)) : [],
        keys: env.COURSE_VIDEOS ? Object.keys(env.COURSE_VIDEOS) : [],
      };

      // Try to use the R2 bucket
      if (env.COURSE_VIDEOS) {
        try {
          // Test basic put operation
          await env.COURSE_VIDEOS.put('test.txt', 'Hello World');
          debug.putSuccess = true;

          // Test get operation
          const obj = await env.COURSE_VIDEOS.get('test.txt');
          debug.getSuccess = !!obj;

          // Clean up
          await env.COURSE_VIDEOS.delete('test.txt');
          debug.deleteSuccess = true;
        } catch (e) {
          debug.error = e.message;
          debug.stack = e.stack;
        }
      }

      return new Response(JSON.stringify(debug, null, 2), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
