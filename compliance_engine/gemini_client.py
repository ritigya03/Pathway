import google.generativeai as genai
import os
import json
import re
import sys
import time
from dotenv import load_dotenv

load_dotenv()

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        print(f"🔑 Initializing Gemini (API Key: {api_key[:8]}...)")
        sys.stdout.flush()
        
        try:
            genai.configure(api_key=api_key)
            # Use gemini-1.5-flash for faster response
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            print("✅ Gemini client initialized successfully")
            sys.stdout.flush()
        except Exception as e:
            print(f"❌ Failed to initialize Gemini: {e}")
            raise
    
    def analyze_with_context(self, context, policy, query):
        """Analyze with context using Gemini"""
        
        # Format policy for display
        if isinstance(policy, dict):
            policy_str = json.dumps(policy, indent=2)
        else:
            policy_str = str(policy)
        
        # Limit context size to avoid timeouts
        context = context[:8000] if len(context) > 8000 else context
        policy_str = policy_str[:4000] if len(policy_str) > 4000 else policy_str
        
        prompt = f"""ROLE: You are a senior compliance analyst specializing in corporate governance and regulatory compliance.

TASK: Analyze the provided documents against the compliance policy.

DOCUMENTS CONTEXT:
{context}

COMPLIANCE POLICY:
{policy_str}

ANALYSIS REQUEST:
{query}

OUTPUT FORMAT (JSON ONLY):
{{
    "risk_assessment": "HIGH/MEDIUM/LOW",
    "key_findings": ["finding1", "finding2", "finding3"],
    "policy_violations": ["violation1"],
    "recommendations": ["recommendation1", "recommendation2"],
    "confidence_score": 0.85,
    "summary": "brief 2-3 sentence summary"
}}

INSTRUCTIONS:
1. Base analysis ONLY on the provided documents and policy
2. Be specific and cite evidence when possible
3. Focus on factual compliance issues
4. Return ONLY valid JSON, no other text
5. Use "N/A" for any field if information is not available
6. Keep findings concise and actionable
"""
        
        max_retries = 3
        retry_delay = 2
        
        for attempt in range(max_retries):
            try:
                print(f"📤 Sending request to Gemini API (attempt {attempt + 1}/{max_retries})...")
                sys.stdout.flush()
                
                # Set timeout for generation
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=2000,
                        temperature=0.1,  # Lower temperature for more consistent results
                    )
                )
                
                result_text = response.text
                
                # Clean the response
                result_text = result_text.strip()
                
                # Remove markdown code blocks if present
                result_text = re.sub(r'```json\s*', '', result_text)
                result_text = re.sub(r'```\s*', '', result_text)
                
                # Try to extract JSON from response
                json_match = re.search(r'\{.*\}', result_text, re.DOTALL)
                if json_match:
                    json_str = json_match.group()
                    try:
                        result = json.loads(json_str)
                        print(f"✅ Gemini analysis complete (Risk: {result.get('risk_assessment', 'UNKNOWN')})")
                        sys.stdout.flush()
                        return result
                    except json.JSONDecodeError as e:
                        print(f"⚠️ JSON parsing failed: {e}")
                        if attempt < max_retries - 1:
                            print(f"   Retrying in {retry_delay} seconds...")
                            sys.stdout.flush()
                            time.sleep(retry_delay)
                            continue
                
                # Fallback: Create structured result from text
                print("⚠️ Could not parse JSON, creating structured result from text")
                return self._create_fallback_result(result_text)
                    
            except Exception as e:
                print(f"❌ Gemini API error (attempt {attempt + 1}): {e}")
                sys.stdout.flush()
                
                if attempt < max_retries - 1:
                    print(f"   Retrying in {retry_delay} seconds...")
                    sys.stdout.flush()
                    time.sleep(retry_delay)
                    retry_delay *= 2  # Exponential backoff
                else:
                    print("❌ All retry attempts failed")
                    return self._create_error_result(str(e))
        
        return self._create_error_result("Max retries exceeded")
    
    def _create_fallback_result(self, text):
        """Create a fallback result when JSON parsing fails"""
        return {
            "risk_assessment": "MEDIUM",
            "key_findings": [
                f"Analysis: {text[:200]}..." if len(text) > 200 else text
            ],
            "policy_violations": ["Could not parse detailed violations"],
            "recommendations": ["Review documents manually for detailed analysis"],
            "confidence_score": 0.3,
            "summary": text[:500] if len(text) > 500 else text
        }
    
    def _create_error_result(self, error_msg):
        """Create an error result"""
        return {
            "risk_assessment": "ERROR",
            "key_findings": [f"Analysis failed: {error_msg[:100]}"],
            "policy_violations": [],
            "recommendations": [
                "Retry the analysis",
                "Check API configuration and quota",
                "Verify network connection"
            ],
            "confidence_score": 0.0,
            "summary": f"Analysis failed due to API error: {error_msg}"
        }