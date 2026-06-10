import { Metadata } from 'next';
import Link from 'next/link';
import { AnimatedHero } from '@/components/ui/animated-hero';
import { AnimatedSection } from '@/components/ui/animated-section';
import { getAllProducts } from '@/lib/products-data';
import ProductsList from './ProductsList';

export const metadata: Metadata = {
  title: 'Products | Curvvtech',
  description:
    'Curvvtech SaaS products—tools we build and operate to help teams scale sales, support, and operations.',
};

const heroGradient =
  'relative w-full pt-44 2xl:pb-20 pb-10 before:absolute before:w-full before:h-full before:bg-linear-to-r before:from-blue_gradient before:via-white before:to-yellow_gradient before:rounded-full before:top-24 before:blur-3xl before:-z-10 dark:before:from-dark_blue_gradient dark:before:via-black dark:before:to-dark_yellow_gradient dark:before:rounded-full dark:before:blur-3xl dark:before:-z-10';

const blurb =
  'Software we ship and run ourselves—focused products that solve real workflow problems for modern teams.';

export default function ProductsPage() {
  const list = getAllProducts();

  return (
    <main>
      <section>
        <div className={heroGradient}>
          <div className="container relative z-10">
            <AnimatedHero className="flex flex-col gap-8">
              <div className="flex flex-col text-center items-center gap-4">
                <h1>Our Products</h1>
                <p className="max-w-38 text-dark_black/60 dark:text-white/60">{blurb}</p>
              </div>
            </AnimatedHero>
          </div>
        </div>
      </section>
      <section>
        <div className="2xl:py-20 py-11">
          <div className="container">
            <AnimatedSection className="flex flex-col gap-12">
              <ProductsList items={list} />
              <div className="flex flex-col items-center justify-center mt-16 w-full">
                <Link
                  href="/contact"
                  className="group bg-purple_blue text-white font-medium flex flex-row justify-between items-center py-2 px-5 rounded-full max-w-64 w-full md:py-3 border border-purple_blue transition-all duration-200 ease-in-out hover:bg-transparent hover:text-purple_blue"
                >
                  <span className="flex text-start transform transition-transform duration-200 ease-in-out group-hover:translate-x-28">
                    Talk to us
                  </span>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 40 40"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="transform transition-transform duration-200 ease-in-out group-hover:-translate-x-44 group-hover:rotate-45"
                  >
                    <rect
                      width="40"
                      height="40"
                      rx="20"
                      className="fill-white transition-colors duration-200 ease-in-out group-hover:fill-purple_blue"
                    />
                    <path
                      d="M15.832 15.3334H24.1654V23.6667"
                      className="stroke-[#1B1D1E] transition-colors duration-200 ease-in-out group-hover:stroke-white"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M15.832 23.6667L24.1654 15.3334"
                      className="stroke-[#1B1D1E] transition-colors duration-500 ease-in-out group-hover:stroke-white"
                      strokeWidth="1.66667"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  );
}
