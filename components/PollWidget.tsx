
import React, { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { Poll } from '../types';
import { getActivePoll, updatePollVotes } from '../services/storageService';

export const PollWidget: React.FC = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load active poll from storage
  useEffect(() => {
    const activePoll = getActivePoll();
    
    if (activePoll) {
      setPoll(activePoll);
      
      // Check if user has already voted
      const savedVote = localStorage.getItem(`poll_vote_${activePoll.id}`);
      if (savedVote) {
        setSelectedOption(savedVote);
        setHasVoted(true);
        setShowResults(true);
      } else if (activePoll.totalVotes > 0) {
        // Show results if poll has votes but user hasn't voted
        setShowResults(true);
      }
    } else {
      // Default poll if no active poll exists
      setPoll({
        id: 'default-poll',
        question: 'როგორ შეაფასებთ მთავრობის ახალ ეკონომიკურ პროგრამას?',
        options: [
          { id: 'opt1', text: 'ძალიან პოზიტიურად', votes: 0 },
          { id: 'opt2', text: 'დადებითად', votes: 0 },
          { id: 'opt3', text: 'ნეიტრალურად', votes: 0 },
          { id: 'opt4', text: 'ნეგატიურად', votes: 0 },
        ],
        totalVotes: 0,
        active: true,
      });
    }
  }, []);

  const handleVote = (optionId: string) => {
    if (!poll || hasVoted || showResults) return;

    // Update votes in storage
    updatePollVotes(poll.id, optionId);

    // Update local state
    const updatedPoll = {
      ...poll,
      options: poll.options.map(opt =>
        opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
      ),
      totalVotes: poll.totalVotes + 1,
    };

    setPoll(updatedPoll);
    setSelectedOption(optionId);
    setHasVoted(true);
    setShowResults(true);

    // Save user's vote
    localStorage.setItem(`poll_vote_${poll.id}`, optionId);
  };

  const getPercentage = (votes: number): number => {
    if (!poll || poll.totalVotes === 0) return 0;
    return Math.round((votes / poll.totalVotes) * 100);
  };

  if (!poll) return null;

  return (
    <div className="bg-gradient-to-br from-news-black to-gray-900 text-white p-6 rounded-sm shadow-lg border border-gray-800 animate-in fade-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-news-accent" size={20} />
        <h3 className="font-bold text-lg">დღის გამოკითხვა</h3>
      </div>
      
      <p className="text-sm text-gray-200 mb-6 leading-relaxed font-medium">
        {poll.question}
      </p>

      <div className="space-y-3">
        {poll.options.map((option) => {
          const percentage = getPercentage(option.votes);
          const isSelected = selectedOption === option.id;
          const showProgress = showResults && poll.totalVotes > 0;

          return (
            <div key={option.id} className="relative">
              {!showResults ? (
                <button
                  onClick={() => handleVote(option.id)}
                  className="w-full text-left px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-sm transition-all duration-200 hover:border-news-accent hover:shadow-md group"
                >
                  <span className="text-sm font-medium text-white group-hover:text-news-accent transition-colors">
                    {option.text}
                  </span>
                </button>
              ) : (
                <div className="relative">
                  <div
                    className={`px-4 py-3 rounded-sm transition-all duration-500 ${
                      isSelected
                        ? 'bg-news-accent/30 border-2 border-news-accent'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                        {option.text}
                      </span>
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-news-accent" />
                        )}
                        <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${
                          isSelected ? 'bg-news-accent' : 'bg-white/30'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 mt-1 block">
                      {option.votes} ხმა
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showResults && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400 text-center">
            სულ ხმები: <span className="font-bold text-white">{poll.totalVotes}</span>
          </p>
        </div>
      )}
    </div>
  );
};

