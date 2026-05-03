from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
import random
import time
import os

# Initialize LLM 
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError(
        "API key required: set GOOGLE_API_KEY or GEMINI_API_KEY environment variable."
    )

llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    api_key=api_key
)

# Generate Post
def generate_post():
    prompt = """
    You are a social media manager.
    Choose a trending topic (AI, memes, tech) and write a short engaging post.
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

# Post
def post_content(content):
    print("📢 Posting:\n", content)

# Feedback
def collect_feedback():
    return {
        "likes": random.randint(50, 300),
        "comments": random.randint(5, 50)
    }

# Improve Strategy
def improve_strategy(history):
    prompt = f"""
    Based on this past performance:
    {history}
    Suggest what type of content performs best.
    """
    response = llm.invoke([HumanMessage(content=prompt)])
    return response.content

# Agent Loop
def run_agent():
    history = []

    while True:
        print("\n🚀 New Cycle")

        content = generate_post()
        post_content(content)

        feedback = collect_feedback()
        print("📊 Feedback:", feedback)

        history.append({
            "content": content,
            "feedback": feedback
        })

        insight = improve_strategy(history)
        print("🧠 Strategy Insight:\n", insight)

        time.sleep(5)

if __name__ == "__main__":
    run_agent()