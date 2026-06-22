import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Globe,
  Heart,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  AboutUsContent,
  defaultAboutUsContent,
  getContentByKey,
  parseAboutUsContent,
} from '../lib/content';

const valueIcons = {
  shield: Shield,
  heart: Heart,
  users: Users,
  zap: Zap,
};

const impactIcons = {
  users: Users,
  globe: Globe,
  trending: TrendingUp,
  award: Award,
};

const AboutUs: React.FC = () => {
  const [content, setContent] = useState<AboutUsContent>(defaultAboutUsContent);

  useEffect(() => {
    let isMounted = true;

    const loadContent = async () => {
      const entry = await getContentByKey('about_us');
      if (isMounted) {
        setContent(parseAboutUsContent(entry?.content));
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden py-16 text-white sm:py-20">
        <div className="absolute inset-0">
          <img
            src={content.hero.imageUrl}
            alt={content.hero.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-700/80 to-purple-700/80" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{content.hero.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-indigo-50">
            {content.hero.subtitle}
          </p>
        </div>
      </section>

      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-semibold text-indigo-600">
              <Globe className="h-4 w-4" />
              {content.mission.eyebrow}
            </div>
            <h2 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
              {content.mission.title}
            </h2>
            <p className="mt-6 leading-relaxed text-gray-600">{content.mission.body}</p>
            <p className="mt-5 leading-relaxed text-gray-600">{content.mission.secondBody}</p>
          </div>

          <div className="relative">
            <img
              src={content.mission.imageUrl}
              alt={content.mission.title}
              className="aspect-[4/3] w-full rounded-xl object-cover shadow-2xl"
            />
            <div className="absolute -bottom-5 right-4 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 px-6 py-5 text-white shadow-xl sm:right-[-1rem]">
              <div className="text-2xl font-bold">{content.mission.statValue}</div>
              <div className="text-sm font-semibold text-indigo-100">{content.mission.statLabel}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-gray-900">{content.story.title}</h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">{content.story.subtitle}</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {content.story.milestones.map((milestone) => (
              <article key={`${milestone.year}-${milestone.title}`} className="rounded-xl bg-gray-50 p-6 shadow-sm">
                <div className="relative overflow-hidden rounded-lg">
                  <img
                    src={milestone.imageUrl}
                    alt={milestone.title}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white">
                    {milestone.year}
                  </span>
                </div>
                <h3 className="mt-5 font-bold text-gray-900">{milestone.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{milestone.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-gray-900 to-indigo-900 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">{content.values.title}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-indigo-100">{content.values.subtitle}</p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.values.items.map((item) => {
              const Icon = valueIcons[item.icon] || Shield;
              return (
                <div key={item.title} className="text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="mt-6 font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-indigo-100">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">{content.leadership.title}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-gray-600">{content.leadership.subtitle}</p>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {content.leadership.members.map((member) => (
              <article key={member.name} className="rounded-xl bg-gray-50 p-8 shadow-sm">
                <img
                  src={member.imageUrl}
                  alt={member.name}
                  className="mx-auto h-24 w-24 rounded-full object-cover"
                />
                <h3 className="mt-6 font-bold text-gray-900">{member.name}</h3>
                <p className="mt-1 text-sm font-bold text-indigo-600">{member.role}</p>
                <p className="mt-5 text-sm leading-relaxed text-gray-600">{member.bio}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold">{content.impact.title}</h2>
          <p className="mx-auto mt-5 max-w-3xl text-indigo-100">{content.impact.subtitle}</p>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {content.impact.stats.map((stat) => {
              const Icon = impactIcons[stat.icon] || Users;
              return (
                <div key={`${stat.value}-${stat.label}`} className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 text-indigo-100">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="mt-5 text-4xl font-bold">{stat.value}</div>
                  <div className="mt-2 text-sm font-medium text-indigo-100">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900">{content.cta.title}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
            {content.cta.subtitle}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/learners"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              {content.cta.primaryButtonText}
            </Link>
            <Link
              to="/tutors"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-600 px-8 py-3 font-semibold text-indigo-600 transition hover:bg-indigo-50"
            >
              {content.cta.secondaryButtonText}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutUs;
